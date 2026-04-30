// @vitest-environment node
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Must run before static imports so the module-level IIFE in crypto.ts finds the key.
vi.hoisted(() => {
  process.env.CALENDAR_ENCRYPTION_KEY = Buffer.alloc(32, 0).toString("base64");
});

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { encryptJson } from "../domain/crypto";

const modules = import.meta.glob("/convex/**/*.ts");

const TEST_KEY = Buffer.alloc(32, 0).toString("base64");

beforeEach(() => {
  vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stubFetches(
  handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>,
) {
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
      externalAuthId: "clerk_user",
      email: "me@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function seedGoogleConnection(
  t: TestConvex<typeof schema>,
  opts: {
    expiresInMs?: number;
    enabled?: string[];
    scope?: string;
    nonce?: string;
  } = {},
): Promise<{ userId: Id<"users">; connectionId: Id<"calendarConnections"> }> {
  const userId = await seedUser(t);
  const tokens = encryptJson({ accessToken: "access-1", refreshToken: "refresh-1" });
  const connectionId = await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "google",
      label: "Google",
      oauthClientId: "client-id",
      encryptedTokens: tokens,
      tokenExpiresAt: Date.now() + (opts.expiresInMs ?? 60 * 60 * 1000),
      enabledSubCalendarIds: opts.enabled,
      scope: opts.scope,
      refreshNonce: opts.nonce,
      createdAt: Date.now(),
    }),
  );
  return { userId, connectionId };
}

describe("GoogleCalendarAdapter.fetchEvents — transparent event filtering", () => {
  test("events with transparency='transparent' are excluded from the result", async () => {
    const t = convexTest(schema, modules);
    const { userId, connectionId } = await seedGoogleConnection(t, { enabled: ["primary"] });

    stubFetches([
      () =>
        json({
          items: [
            {
              id: "evt-opaque",
              summary: "Shoot day",
              transparency: "opaque",
              start: { dateTime: "2026-05-01T09:00:00Z" },
              end: { dateTime: "2026-05-01T18:00:00Z" },
            },
            {
              id: "evt-transparent",
              summary: "Out of office",
              transparency: "transparent",
              start: { dateTime: "2026-05-02T09:00:00Z" },
              end: { dateTime: "2026-05-02T18:00:00Z" },
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
    expect(events.map((e) => e.externalId)).toEqual(["primary::evt-opaque"]);
  });

  test("events with no transparency field are included", async () => {
    const t = convexTest(schema, modules);
    const { userId, connectionId } = await seedGoogleConnection(t, { enabled: ["cal"] });

    stubFetches([
      () =>
        json({
          items: [
            {
              id: "evt-1",
              summary: "Production meeting",
              start: { dateTime: "2026-05-01T10:00:00Z" },
              end: { dateTime: "2026-05-01T11:00:00Z" },
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
    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe("cal::evt-1");
  });
});

describe("GoogleCalendarAdapter.listSubCalendars — birthday/holiday filtering", () => {
  test("birthday calendars are excluded even when present in the API response", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seedGoogleConnection(t);

    stubFetches([
      () =>
        json({
          items: [
            {
              id: "me@example.com",
              summary: "Personal",
              primary: true,
              accessRole: "owner",
            },
            {
              id: "addressbook#contacts@group.v.calendar.google.com",
              summary: "Birthdays",
              accessRole: "reader",
            },
          ],
        }),
    ]);

    const result = await t.action(internal.calendars.google.listGoogleSubCalendarsInternal, {
      connectionId,
    });

    expect(result.map((c) => c.id)).toEqual(["me@example.com"]);
    expect(result.find((c) => c.label === "Birthdays")).toBeUndefined();
  });

  test("holiday calendars are excluded even when present in the API response", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seedGoogleConnection(t);

    stubFetches([
      () =>
        json({
          items: [
            {
              id: "me@example.com",
              summary: "Personal",
              primary: true,
              accessRole: "owner",
            },
            {
              id: "en.uk#holiday@group.v.calendar.google.com",
              summary: "Holidays in United Kingdom",
              accessRole: "reader",
            },
          ],
        }),
    ]);

    const result = await t.action(internal.calendars.google.listGoogleSubCalendarsInternal, {
      connectionId,
    });

    expect(result.map((c) => c.id)).toEqual(["me@example.com"]);
    expect(result.find((c) => c.label?.includes("Holiday"))).toBeUndefined();
  });

  test("returns SubCalendar with id, label, primary, and hint (accessRole)", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seedGoogleConnection(t);

    stubFetches([
      () =>
        json({
          items: [
            {
              id: "me@example.com",
              summary: "Personal",
              summaryOverride: "My Cal",
              primary: true,
              accessRole: "owner",
            },
            {
              id: "work@group.calendar.google.com",
              summary: "Work",
              accessRole: "writer",
            },
          ],
        }),
    ]);

    const result = await t.action(internal.calendars.google.listGoogleSubCalendarsInternal, {
      connectionId,
    });

    expect(result).toEqual([
      { id: "me@example.com", label: "My Cal", primary: true, hint: "owner" },
      { id: "work@group.calendar.google.com", label: "Work", primary: false, hint: "writer" },
    ]);
  });
});

describe("GoogleCalendarAdapter.ensureAccessToken — nonce race", () => {
  test("concurrent refresh: losing action re-reads winner's token without a second HTTP refresh", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const expiredTokens = encryptJson({ accessToken: "expired", refreshToken: "refresh-1" });
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "google",
        label: "Google",
        oauthClientId: "client-id",
        encryptedTokens: expiredTokens,
        tokenExpiresAt: Date.now() - 1000,
        refreshNonce: "initial-nonce",
        enabledSubCalendarIds: ["cal"],
        createdAt: Date.now(),
      }),
    );

    let tokenRefreshCallCount = 0;
    const { calls } = stubFetches([
      // Token refresh — simulate another concurrent action winning by writing a
      // new nonce into the DB before this action's CAS mutation runs.
      async (url: string) => {
        if (url.includes("oauth2.googleapis.com/token")) {
          tokenRefreshCallCount++;
          const otherTokens = encryptJson({ accessToken: "token-from-winner", refreshToken: "r" });
          await t.run((ctx) =>
            ctx.db.patch(connectionId, {
              refreshNonce: "nonce-from-winner",
              encryptedTokens: otherTokens,
              tokenExpiresAt: Date.now() + 3600 * 1000,
            }),
          );
        }
        return json({ access_token: "token-from-this-action", expires_in: 3600 });
      },
      // Events list — called with the re-read token (token-from-winner)
      () => json({ items: [] }),
    ]);

    await t.action(internal.calendars.google.syncGoogleConnectionInternal, {
      connectionId,
      userId,
    });

    expect(tokenRefreshCallCount).toBe(1);
    const eventsCall = calls[1];
    expect((eventsCall.init?.headers as Record<string, string>)?.Authorization).toBe(
      "Bearer token-from-winner",
    );
    const conn = (await t.run((ctx) => ctx.db.get(connectionId))) as Doc<"calendarConnections">;
    expect(conn.refreshNonce).toBe("nonce-from-winner");
  });
});

describe("GoogleCalendarAdapter.fetchEvents — multiple sub-calendars", () => {
  test("returns events from all enabled sub-calendars", async () => {
    const t = convexTest(schema, modules);
    const { userId, connectionId } = await seedGoogleConnection(t, {
      enabled: ["work", "personal"],
    });

    stubFetches([
      // events for "work"
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
      // events for "personal"
      () =>
        json({
          items: [
            {
              id: "p-1",
              summary: "Personal item",
              start: { dateTime: "2026-05-02T09:00:00Z" },
              end: { dateTime: "2026-05-02T10:00:00Z" },
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
    const ids = events.map((e) => e.externalId).sort();
    expect(ids).toEqual(["personal::p-1", "work::w-1"]);
  });
});
