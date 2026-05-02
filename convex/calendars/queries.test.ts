/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const identity = {
  subject: "clerk_user_42",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_42",
};

async function insertUser(t: TestConvex<typeof schema>, externalAuthId: string) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email: `${externalAuthId}@example.com`,
      hasCompletedOnboarding: true,
      isPublic: false,
    }),
  );
}

async function insertConnection(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  overrides: {
    label?: string;
    color?: string;
    provider?: "google" | "microsoft" | "ical" | "native";
    encryptedTokens?: ArrayBuffer;
    scope?: string;
    oauthClientId?: string;
    refreshNonce?: string;
    icalUrl?: string;
    lastSyncedAt?: number;
    lastSyncError?: string;
    syncErrorCount?: number;
  } = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: overrides.provider ?? "google",
      label: overrides.label ?? "Work",
      color: overrides.color ?? "#6366f1",
      createdAt: Date.now(),
      syncErrorCount: overrides.syncErrorCount ?? 0,
      encryptedTokens: overrides.encryptedTokens,
      scope: overrides.scope,
      oauthClientId: overrides.oauthClientId,
      refreshNonce: overrides.refreshNonce,
      icalUrl: overrides.icalUrl,
      lastSyncedAt: overrides.lastSyncedAt,
      lastSyncError: overrides.lastSyncError,
    }),
  );
}

async function insertSubCalendar(
  t: TestConvex<typeof schema>,
  connectionId: Id<"calendarConnections">,
  externalId = "primary",
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId,
      label: externalId,
      showAsBusy: true,
    }),
  );
}

async function insertEvent(
  t: TestConvex<typeof schema>,
  args: {
    userId: Id<"users">;
    connectionId: Id<"calendarConnections">;
    subCalendarId: Id<"calendarSubCalendars">;
    title: string;
    startsAt: number;
    endsAt?: number;
    isAllDay?: boolean;
  },
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarEvents", {
      userId: args.userId,
      connectionId: args.connectionId,
      subCalendarId: args.subCalendarId,
      externalId: args.title,
      title: args.title,
      startsAt: args.startsAt,
      endsAt: args.endsAt ?? args.startsAt + 60 * 60 * 1000,
      isAllDay: args.isAllDay ?? false,
      updatedAt: Date.now(),
    }),
  );
}

describe("getConnections", () => {
  test("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.calendars.queries.getConnections, {})).rejects.toThrow(
      "Not authenticated",
    );
  });

  test("throws when authenticated but no user row exists", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(identity).query(api.calendars.queries.getConnections, {}),
    ).rejects.toThrow("User not found");
  });

  test("returns empty array when the user has no connections", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);
    const result = await t.withIdentity(identity).query(api.calendars.queries.getConnections, {});
    expect(result).toEqual([]);
  });

  test("strips sensitive fields from each connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    await insertConnection(t, userId, {
      label: "Work",
      provider: "google",
      color: "#ff0000",
      encryptedTokens: new ArrayBuffer(8),
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      oauthClientId: "client-123",
      refreshNonce: "nonce-abc",
      icalUrl: "https://example.com/ical",
      lastSyncedAt: 1_700_000_000_000,
      lastSyncError: "boom",
      syncErrorCount: 2,
    });

    const result = await t.withIdentity(identity).query(api.calendars.queries.getConnections, {});

    expect(result).toHaveLength(1);
    const [connection] = result;
    expect(connection).not.toHaveProperty("encryptedTokens");
    expect(connection).not.toHaveProperty("scope");
    expect(connection).not.toHaveProperty("oauthClientId");
    expect(connection).not.toHaveProperty("refreshNonce");
    expect(connection).not.toHaveProperty("icalUrl");
  });

  test("returns the documented public fields", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    await insertConnection(t, userId, {
      label: "Personal",
      provider: "ical",
      color: "#22c55e",
      lastSyncedAt: 1_700_000_000_000,
      lastSyncError: "rate limited",
      syncErrorCount: 1,
    });

    const result = await t.withIdentity(identity).query(api.calendars.queries.getConnections, {});

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Personal",
      provider: "ical",
      color: "#22c55e",
      lastSyncedAt: 1_700_000_000_000,
      lastSyncError: "rate limited",
      syncErrorCount: 1,
    });
    expect(result[0]._id).toBeDefined();
  });

  test("includes the active sub-calendar count for each connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    const connectionA = await insertConnection(t, userId, { label: "A" });
    const connectionB = await insertConnection(t, userId, { label: "B" });
    await insertSubCalendar(t, connectionA, "primary");
    await insertSubCalendar(t, connectionA, "secondary");
    await insertSubCalendar(t, connectionA, "tertiary");
    await insertSubCalendar(t, connectionB, "only");

    const result = await t.withIdentity(identity).query(api.calendars.queries.getConnections, {});

    const byLabel = Object.fromEntries(result.map((c) => [c.label, c.subCalendarCount]));
    expect(byLabel).toEqual({ A: 3, B: 1 });
  });

  test("does not return connections owned by other users", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await insertUser(t, identity.subject);
    const otherId = await insertUser(t, "other_clerk_user");
    await insertConnection(t, ownerId, { label: "mine" });
    await insertConnection(t, otherId, { label: "theirs" });

    const result = await t.withIdentity(identity).query(api.calendars.queries.getConnections, {});

    expect(result.map((c) => c.label)).toEqual(["mine"]);
  });
});

describe("getEventsForDateRange", () => {
  test("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.calendars.queries.getEventsForDateRange, { startMs: 0, endMs: 1 }),
    ).rejects.toThrow("Not authenticated");
  });

  test("returns events whose startsAt falls within [startMs, endMs)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    const connectionId = await insertConnection(t, userId, { color: "#abcdef" });
    const subCalendarId = await insertSubCalendar(t, connectionId);

    const startMs = 1_700_000_000_000;
    const endMs = startMs + 7 * 24 * 60 * 60 * 1000;

    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "before",
      startsAt: startMs - 1,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "at-start",
      startsAt: startMs,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "middle",
      startsAt: startMs + 60_000,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "at-end",
      startsAt: endMs,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDateRange, { startMs, endMs });

    expect(result.map((e) => e.title).sort()).toEqual(["at-start", "middle"]);
  });

  test("attaches the connection color to each event", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    const connectionId = await insertConnection(t, userId, { color: "#123456" });
    const subCalendarId = await insertSubCalendar(t, connectionId);

    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "evt",
      startsAt: 1_000,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDateRange, { startMs: 0, endMs: 10_000 });

    expect(result).toHaveLength(1);
    expect(result[0].color).toBe("#123456");
  });

  test("does not return events belonging to another user", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await insertUser(t, identity.subject);
    const otherId = await insertUser(t, "other_clerk_user");
    const ownerConn = await insertConnection(t, ownerId, { label: "mine" });
    const otherConn = await insertConnection(t, otherId, { label: "theirs" });
    const ownerSub = await insertSubCalendar(t, ownerConn);
    const otherSub = await insertSubCalendar(t, otherConn);

    await insertEvent(t, {
      userId: ownerId,
      connectionId: ownerConn,
      subCalendarId: ownerSub,
      title: "mine",
      startsAt: 1_000,
    });
    await insertEvent(t, {
      userId: otherId,
      connectionId: otherConn,
      subCalendarId: otherSub,
      title: "theirs",
      startsAt: 1_000,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDateRange, { startMs: 0, endMs: 10_000 });

    expect(result.map((e) => e.title)).toEqual(["mine"]);
  });
});

describe("getEventsForDate", () => {
  test("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.calendars.queries.getEventsForDate, { startMs: 0, endMs: 1 }),
    ).rejects.toThrow("Not authenticated");
  });

  test("returns all-day events first, then by startsAt ascending", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    const connectionId = await insertConnection(t, userId);
    const subCalendarId = await insertSubCalendar(t, connectionId);

    const startMs = 1_700_000_000_000;
    const endMs = startMs + 24 * 60 * 60 * 1000;

    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "noon",
      startsAt: startMs + 12 * 60 * 60 * 1000,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "all-day-late",
      startsAt: startMs + 60_000,
      isAllDay: true,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "morning",
      startsAt: startMs + 9 * 60 * 60 * 1000,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "all-day-early",
      startsAt: startMs,
      isAllDay: true,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDate, { startMs, endMs });

    expect(result.map((e) => e.title)).toEqual([
      "all-day-early",
      "all-day-late",
      "morning",
      "noon",
    ]);
  });

  test("filters by [startMs, endMs) — endMs is exclusive", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    const connectionId = await insertConnection(t, userId);
    const subCalendarId = await insertSubCalendar(t, connectionId);

    const startMs = 1_700_000_000_000;
    const endMs = startMs + 24 * 60 * 60 * 1000;

    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "before",
      startsAt: startMs - 1,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "in",
      startsAt: startMs,
    });
    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "at-end",
      startsAt: endMs,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDate, { startMs, endMs });

    expect(result.map((e) => e.title)).toEqual(["in"]);
  });

  test("attaches the connection color to each event", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    const connectionId = await insertConnection(t, userId, { color: "#deadbe" });
    const subCalendarId = await insertSubCalendar(t, connectionId);

    await insertEvent(t, {
      userId,
      connectionId,
      subCalendarId,
      title: "evt",
      startsAt: 1_000,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDate, { startMs: 0, endMs: 10_000 });

    expect(result).toHaveLength(1);
    expect(result[0].color).toBe("#deadbe");
  });

  test("does not return events belonging to another user", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await insertUser(t, identity.subject);
    const otherId = await insertUser(t, "other_clerk_user");
    const ownerConn = await insertConnection(t, ownerId);
    const otherConn = await insertConnection(t, otherId);
    const ownerSub = await insertSubCalendar(t, ownerConn);
    const otherSub = await insertSubCalendar(t, otherConn);

    await insertEvent(t, {
      userId: ownerId,
      connectionId: ownerConn,
      subCalendarId: ownerSub,
      title: "mine",
      startsAt: 1_000,
    });
    await insertEvent(t, {
      userId: otherId,
      connectionId: otherConn,
      subCalendarId: otherSub,
      title: "theirs",
      startsAt: 1_000,
    });

    const result = await t
      .withIdentity(identity)
      .query(api.calendars.queries.getEventsForDate, { startMs: 0, endMs: 10_000 });

    expect(result.map((e) => e.title)).toEqual(["mine"]);
  });
});
