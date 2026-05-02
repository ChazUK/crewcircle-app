/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { decryptJson, encryptJson } from "../domain/crypto";
import { ensureAccessToken } from "./google";

const modules = import.meta.glob("/convex/**/*.ts");

// Base64-encoded 32-byte test key (all 0x01 bytes)
const TEST_KEY = btoa(String.fromCharCode(...new Array(32).fill(1)));

async function insertUser(t: TestConvex<typeof schema>) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "owner",
      email: "owner@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function insertConnection(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  overrides: Partial<{
    encryptedTokens: ArrayBuffer;
    tokenExpiresAt: number;
    refreshNonce: string;
  }> = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "google",
      label: "Work",
      color: "#6366f1",
      createdAt: 0,
      syncErrorCount: 0,
      oauthClientId: "test-client-id",
      ...overrides,
    }),
  );
}

describe("ensureAccessToken", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("returns existing access token without refresh when expiry is more than 60s away", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedTokens = await encryptJson({
      accessToken: "valid-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
    const connectionId = await insertConnection(t, userId, {
      encryptedTokens,
      tokenExpiresAt: Date.now() + 120_000,
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const token = await t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id"));

    expect(token).toBe("valid-token");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("refreshes and returns new token when within 60 seconds of expiry", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedTokens = await encryptJson({
      accessToken: "old-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
    const connectionId = await insertConnection(t, userId, {
      encryptedTokens,
      tokenExpiresAt: Date.now() + 30_000,
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      }),
    );

    const token = await t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id"));

    expect(token).toBe("new-token");
    const updated = await t.run((ctx) => ctx.db.get(connectionId));
    expect(updated?.tokenExpiresAt).toBeGreaterThan(Date.now() + 3_500_000);
    expect(updated?.refreshNonce).toBeTypeOf("string");
  });

  test("also refreshes when tokenExpiresAt is not set", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedTokens = await encryptJson({
      accessToken: "old-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
    const connectionId = await insertConnection(t, userId, {
      encryptedTokens,
      // no tokenExpiresAt
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      }),
    );

    const token = await t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id"));
    expect(token).toBe("new-token");
  });

  test("throws auth SyncError when no refresh token and token is expiring", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedTokens = await encryptJson({
      accessToken: "old-token",
      tokenType: "Bearer",
      // no refreshToken
    });
    const connectionId = await insertConnection(t, userId, {
      encryptedTokens,
      tokenExpiresAt: Date.now() + 30_000,
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    await expect(
      t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id")),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  test("returns concurrent winner's token when nonce does not match", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);

    const staleTokens = await encryptJson({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
    const concurrentTokens = await encryptJson({
      accessToken: "concurrent-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });

    const connectionId = await insertConnection(t, userId, {
      encryptedTokens: staleTokens,
      tokenExpiresAt: Date.now() + 30_000,
      // no refreshNonce — first refresh ever
    });

    // Read the stale snapshot that ensureAccessToken will receive
    const staleConnection = await t.run((ctx) => ctx.db.get(connectionId));

    // Simulate a concurrent action winning the race: it writes a nonce before our action does
    await t.run((ctx) =>
      ctx.db.patch(connectionId, {
        refreshNonce: "concurrent-winner-nonce",
        encryptedTokens: concurrentTokens,
        tokenExpiresAt: Date.now() + 3_600_000,
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "our-new-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      }),
    );

    // Our action uses the stale snapshot (refreshNonce=undefined), but the DB
    // now has refreshNonce="concurrent-winner-nonce", so updateTokensIfNonce
    // returns false and we re-read the fresh token.
    const token = await t.action((ctx) => ensureAccessToken(ctx, staleConnection!, "client-id"));
    expect(token).toBe("concurrent-token");
  });

  test("preserves existing refresh token when Google does not return a new one", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedTokens = await encryptJson({
      accessToken: "old-token",
      refreshToken: "long-lived-refresh",
      tokenType: "Bearer",
    });
    const connectionId = await insertConnection(t, userId, {
      encryptedTokens,
      tokenExpiresAt: Date.now() + 30_000,
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access",
          expires_in: 3600,
          token_type: "Bearer",
          // no refresh_token in response
        }),
      }),
    );

    await t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id"));

    const updated = await t.run((ctx) => ctx.db.get(connectionId));
    const stored = await decryptJson(updated!.encryptedTokens!);
    expect(stored.refreshToken).toBe("long-lived-refresh");
  });
});
