/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { decryptJson, encryptJson } from "../domain/crypto";
import { ensureAccessToken, MicrosoftCalendarProvider } from "./microsoft";

const modules = import.meta.glob("/convex/**/*.ts");

// Base64-encoded 32-byte test key (all 0x01 bytes)
const TEST_KEY = btoa(String.fromCharCode(...new Array(32).fill(1)));

const FAKE_TOKEN_RESPONSE = {
  access_token: "ms-access-token",
  refresh_token: "ms-refresh-token",
  expires_in: 3600,
  scope: "Calendars.Read",
  token_type: "Bearer",
};

const FAKE_ME_RESPONSE = {
  mail: "user@example.com",
  userPrincipalName: "user@tenant.onmicrosoft.com",
};

const FAKE_CALENDARS_RESPONSE = {
  value: [
    { id: "cal-1", name: "Calendar", isDefaultCalendar: true },
    { id: "cal-2", name: "Birthdays", isDefaultCalendar: false },
  ],
};

function mockFetch(
  responses: Array<{ ok: boolean; json?: () => Promise<unknown>; text?: () => Promise<string> }>,
) {
  let callIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const resp = responses[callIndex++];
      return Promise.resolve(resp);
    }),
  );
}

describe("MicrosoftCalendarProvider.connect", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("exchanges auth code, fetches /me, lists calendars and returns encrypted result", async () => {
    const t = convexTest(schema, modules);

    mockFetch([
      { ok: true, json: async () => FAKE_TOKEN_RESPONSE },
      { ok: true, json: async () => FAKE_ME_RESPONSE },
      { ok: true, json: async () => FAKE_CALENDARS_RESPONSE },
    ]);

    const result = await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    expect(result.connection.externalAccountId).toBe("user@example.com");
    expect(result.connection.oauthClientId).toBe("client-id");
    expect(result.connection.scope).toBe("Calendars.Read");
    expect(result.connection.tokenExpiresAt).toBeGreaterThan(Date.now());
    expect(result.connection.encryptedTokens).toBeInstanceOf(ArrayBuffer);
    expect(result.subCalendars).toHaveLength(2);
    expect(result.subCalendars[0]).toMatchObject({ externalId: "cal-1", label: "Calendar" });
    expect(result.subCalendars[1]).toMatchObject({ externalId: "cal-2", label: "Birthdays" });
  });

  test("falls back to userPrincipalName when mail is null", async () => {
    const t = convexTest(schema, modules);

    mockFetch([
      { ok: true, json: async () => FAKE_TOKEN_RESPONSE },
      {
        ok: true,
        json: async () => ({ mail: null, userPrincipalName: "upn@tenant.onmicrosoft.com" }),
      },
      { ok: true, json: async () => ({ value: [] }) },
    ]);

    const result = await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    expect(result.connection.externalAccountId).toBe("upn@tenant.onmicrosoft.com");
  });

  test("throws auth SyncError when token exchange fails", async () => {
    const t = convexTest(schema, modules);

    mockFetch([{ ok: false, text: async () => "invalid_grant" }]);

    await expect(
      t.action((ctx) =>
        MicrosoftCalendarProvider.connect(
          ctx,
          {
            provider: "microsoft",
            authCode: "bad-code",
            codeVerifier: "verifier",
            clientId: "client-id",
            redirectUri: "https://app.example/callback",
            label: "Work",
          },
          { userId: "user-1", color: "#6366f1" },
        ),
      ),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  test("throws auth SyncError when /me fetch fails", async () => {
    const t = convexTest(schema, modules);

    mockFetch([
      { ok: true, json: async () => FAKE_TOKEN_RESPONSE },
      { ok: false, text: async () => "Unauthorized" },
    ]);

    await expect(
      t.action((ctx) =>
        MicrosoftCalendarProvider.connect(
          ctx,
          {
            provider: "microsoft",
            authCode: "auth-code",
            codeVerifier: "verifier",
            clientId: "client-id",
            redirectUri: "https://app.example/callback",
            label: "Work",
          },
          { userId: "user-1", color: "#6366f1" },
        ),
      ),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  test("paginates /me/calendars by following @odata.nextLink", async () => {
    const t = convexTest(schema, modules);

    const page1Url = "https://graph.microsoft.com/v1.0/me/calendars";
    const page2Url = "https://graph.microsoft.com/v1.0/me/calendars?$skiptoken=PAGE2";

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (parsed.hostname === "login.microsoftonline.com") {
        return Promise.resolve({ ok: true, json: async () => FAKE_TOKEN_RESPONSE });
      }
      if (parsed.hostname === "graph.microsoft.com" && parsed.pathname === "/v1.0/me") {
        return Promise.resolve({ ok: true, json: async () => FAKE_ME_RESPONSE });
      }
      if (url === page1Url) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            value: [{ id: "cal-1", name: "Calendar", isDefaultCalendar: true }],
            "@odata.nextLink": page2Url,
          }),
        });
      }
      if (url === page2Url) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            value: [{ id: "cal-2", name: "Birthdays", isDefaultCalendar: false }],
          }),
        });
      }
      return Promise.resolve({ ok: false, text: async () => "unexpected url" });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    expect(result.subCalendars).toHaveLength(2);
    expect(result.subCalendars[0]).toMatchObject({ externalId: "cal-1", label: "Calendar" });
    expect(result.subCalendars[1]).toMatchObject({ externalId: "cal-2", label: "Birthdays" });
    expect(fetchSpy.mock.calls.filter((c) => String(c[0]).includes("/me/calendars"))).toHaveLength(
      2,
    );
  });

  test("token POST targets the Microsoft common tenant endpoint", async () => {
    const t = convexTest(schema, modules);

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      const { hostname, pathname } = new URL(url);
      if (hostname === "login.microsoftonline.com") {
        return Promise.resolve({ ok: true, json: async () => FAKE_TOKEN_RESPONSE });
      }
      if (hostname === "graph.microsoft.com" && pathname.startsWith("/v1.0/me")) {
        return Promise.resolve({ ok: true, json: async () => FAKE_ME_RESPONSE });
      }
      return Promise.resolve({ ok: true, json: async () => ({ value: [] }) });
    });
    vi.stubGlobal("fetch", fetchSpy);

    await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    const tokenCall = fetchSpy.mock.calls[0];
    expect(tokenCall[0]).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
    expect(tokenCall[1].method).toBe("POST");

    const body = new URLSearchParams(tokenCall[1].body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe("verifier");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("redirect_uri")).toBe("https://app.example/callback");
    expect(body.get("client_secret")).toBeNull();
  });
});

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
      provider: "microsoft",
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
    vi.unstubAllGlobals();
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  test("throws auth SyncError when token refresh HTTP request fails", async () => {
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
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      }),
    );

    await expect(
      t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id")),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  test("refresh POST targets Microsoft token endpoint without client_secret", async () => {
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

    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-token",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id"));

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-token");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("client_secret")).toBeNull();
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
    });

    const staleConnection = await t.run((ctx) => ctx.db.get(connectionId));

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

    const token = await t.action((ctx) => ensureAccessToken(ctx, staleConnection!, "client-id"));
    expect(token).toBe("concurrent-token");
  });

  test("preserves existing refresh token when Microsoft does not return a new one", async () => {
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
        }),
      }),
    );

    await t.action((ctx) => ensureAccessToken(ctx, connection!, "client-id"));

    const updated = await t.run((ctx) => ctx.db.get(connectionId));
    const stored = await decryptJson(updated!.encryptedTokens!);
    expect(stored.refreshToken).toBe("long-lived-refresh");
  });
});
