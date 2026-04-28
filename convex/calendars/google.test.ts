// @vitest-environment node
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";
import { encryptJson } from "./domain/crypto";

const modules = import.meta.glob("/convex/**/*.ts");

const identity = {
  subject: "clerk_google_user",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_google_user",
};

const TEST_KEY = Buffer.alloc(32, 0).toString("base64");

beforeEach(() => {
  vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stubFetches(handlers: Array<(url: string, init?: RequestInit) => Response>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let index = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    const handler = handlers[index++] ?? handlers[handlers.length - 1];
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function seedUser(t: TestConvex<typeof schema>) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "me@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

describe("connectGoogle", () => {
  test("rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.calendars.google.connectGoogle, {
        code: "code",
        codeVerifier: "verifier",
        clientId: "client-id",
        redirectUri: "https://example.com/callback",
      }),
    ).rejects.toThrow(/authenticated/);
  });

  test("exchanges the code, stores encrypted tokens, and pulls primary events", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);

    stubFetches([
      // Token exchange
      () =>
        json({
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "calendar.readonly",
        }),
      // Userinfo
      () => json({ sub: "google_abc", email: "me@google.test" }),
      // calendarList
      () =>
        json({
          items: [
            { id: "me@google.test", primary: true, summary: "Me", accessRole: "owner" },
            { id: "work@group.calendar.google.com", summary: "Work", accessRole: "owner" },
          ],
        }),
      // events.list for primary
      () =>
        json({
          items: [
            {
              id: "evt-1",
              summary: "Standup",
              start: { dateTime: "2026-05-01T09:00:00Z" },
              end: { dateTime: "2026-05-01T09:30:00Z" },
            },
            {
              id: "evt-birthday",
              summary: "Alice",
              eventType: "birthday",
              start: { date: "2026-05-02" },
            },
          ],
        }),
    ]);

    const result = await t.withIdentity(identity).action(api.calendars.google.connectGoogle, {
      code: "code",
      codeVerifier: "verifier",
      clientId: "client-id",
      redirectUri: "https://example.com/callback",
    });

    expect(result.enabledSubCalendarIds).toEqual(["me@google.test"]);
    const connection = (await t.run((ctx) =>
      ctx.db.get(result.connectionId),
    )) as Doc<"calendarConnections">;
    expect(connection.provider).toBe("google");
    expect(connection.externalAccountId).toBe("google_abc");
    expect(connection.oauthClientId).toBe("client-id");
    expect(connection.encryptedTokens).toBeTruthy();

    const events = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", result.connectionId))
        .collect(),
    );
    expect(events.map((e) => e.externalId)).toEqual(["me@google.test::evt-1"]);
  });

  test("records a sync error if event fetching fails but keeps the connection", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);

    stubFetches([
      () => json({ access_token: "a", expires_in: 3600 }),
      () => json({ sub: "google_abc" }),
      () => json({ items: [{ id: "primary-id", primary: true }] }),
      // events.list fails
      () => json({ error: "boom" }, 500),
    ]);

    const result = await t.withIdentity(identity).action(api.calendars.google.connectGoogle, {
      code: "code",
      codeVerifier: "verifier",
      clientId: "client-id",
      redirectUri: "https://example.com/callback",
    });
    const connection = (await t.run((ctx) =>
      ctx.db.get(result.connectionId),
    )) as Doc<"calendarConnections">;
    expect(connection.lastSyncError).toMatch(/Google events fetch failed/);
  });

  test("still connects when calendarList is temporarily unavailable (falls back to 'primary')", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubFetches([
      // Token exchange
      () => json({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
      // Userinfo
      () => json({ sub: "google_abc", email: "me@google.test" }),
      // calendarList fails
      () => json({ error: "backend down" }, 503),
      // events.list for the "primary" alias
      () =>
        json({
          items: [
            {
              id: "evt-1",
              summary: "Fallback",
              start: { dateTime: "2026-05-01T09:00:00Z" },
              end: { dateTime: "2026-05-01T09:30:00Z" },
            },
          ],
        }),
    ]);

    const result = await t.withIdentity(identity).action(api.calendars.google.connectGoogle, {
      code: "c",
      codeVerifier: "v",
      clientId: "client-id",
      redirectUri: "https://example.com/cb",
    });

    expect(result.enabledSubCalendarIds).toEqual(["primary"]);
    const events = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", result.connectionId))
        .collect(),
    );
    expect(events.map((e) => e.externalId)).toEqual(["primary::evt-1"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("calendarList lookup failed"),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });

  test("surfaces Google token-exchange failures", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetches([() => json({ error: "invalid_grant" }, 400)]);
    await expect(
      t.withIdentity(identity).action(api.calendars.google.connectGoogle, {
        code: "bad",
        codeVerifier: "v",
        clientId: "c",
        redirectUri: "r",
      }),
    ).rejects.toThrow(/token exchange/);
  });
});

describe("listGoogleCalendars", () => {
  async function seedConnection(t: TestConvex<typeof schema>, expiresInMs: number) {
    const userId = await seedUser(t);
    const tokens = encryptJson({ accessToken: "access-1", refreshToken: "refresh-1" });
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "google",
        label: "Google",
        oauthClientId: "client-id",
        encryptedTokens: tokens,
        tokenExpiresAt: Date.now() + expiresInMs,
        createdAt: Date.now(),
      }),
    );
    return { userId, connectionId };
  }

  test("returns an adapted list of calendars", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seedConnection(t, 60 * 60 * 1000);
    stubFetches([
      () =>
        json({
          items: [
            {
              id: "cal-1",
              summary: "Primary",
              primary: true,
              accessRole: "owner",
              backgroundColor: "#fff",
            },
            { id: "cal-2", summaryOverride: "Custom label", accessRole: "owner" },
          ],
        }),
    ]);
    const result = await t
      .withIdentity(identity)
      .action(api.calendars.google.listGoogleCalendars, { connectionId });
    expect(result).toEqual([
      {
        id: "cal-1",
        label: "Primary",
        primary: true,
        accessRole: "owner",
        backgroundColor: "#fff",
      },
      {
        id: "cal-2",
        label: "Custom label",
        primary: false,
        accessRole: "owner",
        backgroundColor: undefined,
      },
    ]);
  });

  test("rejects non-Google connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "Web",
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.withIdentity(identity).action(api.calendars.google.listGoogleCalendars, { connectionId }),
    ).rejects.toThrow(/Google/);
  });

  test("rejects when the connection has no stored oauth client id", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "google",
        label: "Bad",
        encryptedTokens: encryptJson({ accessToken: "a" }),
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.withIdentity(identity).action(api.calendars.google.listGoogleCalendars, { connectionId }),
    ).rejects.toThrow(/OAuth client id/);
  });

  test("refreshes expired tokens before listing", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seedConnection(t, -60_000);
    const { calls } = stubFetches([
      // token refresh
      () => json({ access_token: "access-2", expires_in: 3600, token_type: "Bearer" }),
      // calendarList
      () => json({ items: [{ id: "cal-1", summary: "P", primary: true, accessRole: "owner" }] }),
    ]);
    await t
      .withIdentity(identity)
      .action(api.calendars.google.listGoogleCalendars, { connectionId });
    expect(calls[0].url).toContain("oauth2.googleapis.com/token");
    const updated = (await t.run((ctx) => ctx.db.get(connectionId))) as Doc<"calendarConnections">;
    expect(updated.tokenExpiresAt).toBeGreaterThan(Date.now());
  });
});

describe("syncGoogleConnectionInternal", () => {
  async function seedGoogle(
    t: TestConvex<typeof schema>,
    opts: { enabled?: string[] } = {},
  ): Promise<{ userId: Id<"users">; connectionId: Id<"calendarConnections"> }> {
    const userId = await seedUser(t);
    const tokens = encryptJson({ accessToken: "a", refreshToken: "r" });
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "google",
        label: "Google",
        oauthClientId: "client-id",
        encryptedTokens: tokens,
        tokenExpiresAt: Date.now() + 60 * 60 * 1000,
        enabledSubCalendarIds: opts.enabled,
        createdAt: Date.now(),
      }),
    );
    return { userId, connectionId };
  }

  test("syncs events for the enabled sub-calendars", async () => {
    const t = convexTest(schema, modules);
    const { userId, connectionId } = await seedGoogle(t, { enabled: ["work"] });
    stubFetches([
      () =>
        json({
          items: [
            {
              id: "w-1",
              summary: "Work item",
              start: { dateTime: "2026-05-01T09:00:00Z" },
              end: { dateTime: "2026-05-01T10:00:00Z" },
            },
          ],
        }),
    ]);
    await t.action(internal.calendars.google.syncGoogleConnectionInternal, {
      connectionId,
      userId,
    });
    const events = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(events.map((e) => e.externalId)).toEqual(["work::w-1"]);
  });

  test("falls back to 'primary' when nothing is explicitly enabled", async () => {
    const t = convexTest(schema, modules);
    const { userId, connectionId } = await seedGoogle(t, { enabled: [] });
    const { calls } = stubFetches([() => json({ items: [] })]);
    await t.action(internal.calendars.google.syncGoogleConnectionInternal, {
      connectionId,
      userId,
    });
    expect(calls[0].url).toContain("/calendars/primary/events");
  });

  test("records the sync error and rethrows when Google returns 500", async () => {
    const t = convexTest(schema, modules);
    const { userId, connectionId } = await seedGoogle(t, { enabled: ["cal"] });
    stubFetches([() => json({ error: "boom" }, 500)]);
    await expect(
      t.action(internal.calendars.google.syncGoogleConnectionInternal, {
        connectionId,
        userId,
      }),
    ).rejects.toThrow(/Google events fetch/);
    const updated = (await t.run((ctx) => ctx.db.get(connectionId))) as Doc<"calendarConnections">;
    expect(updated.lastSyncError).toMatch(/Google events/);
  });

  test("rejects when the connection belongs to a different user", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seedGoogle(t);
    const stranger = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "other",
        email: "o@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );
    await expect(
      t.action(internal.calendars.google.syncGoogleConnectionInternal, {
        connectionId,
        userId: stranger,
      }),
    ).rejects.toThrow(/not found/);
  });

  test("rejects when the provider is not google", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "ical",
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.action(internal.calendars.google.syncGoogleConnectionInternal, {
        connectionId,
        userId,
      }),
    ).rejects.toThrow(/Google/);
  });

  test("rejects when the connection is missing its oauth client id", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "google",
        label: "Legacy",
        encryptedTokens: encryptJson({ accessToken: "a" }),
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.action(internal.calendars.google.syncGoogleConnectionInternal, {
        connectionId,
        userId,
      }),
    ).rejects.toThrow(/OAuth client id/);
  });
});
