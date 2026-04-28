import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");
const ONE_DAY = 24 * 60 * 60 * 1000;

const identity = {
  subject: "clerk_user_1",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_1",
};

async function setupUserWithConnection() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "me@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
  const connectionId = await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label: "Test",
      createdAt: Date.now(),
    }),
  );
  return { t, userId, connectionId };
}

describe("listConnections", () => {
  test("returns an empty list when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.calendars.queries.listConnections, {});
    expect(result).toEqual([]);
  });

  test("returns an empty list when the caller has no user row", async () => {
    const t = convexTest(schema, modules);
    const result = await t.withIdentity(identity).query(api.calendars.queries.listConnections, {});
    expect(result).toEqual([]);
  });

  test("returns only the caller's connections", async () => {
    const { t } = await setupUserWithConnection();
    const stranger = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "someone-else",
        email: "x@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId: stranger,
        provider: "ical",
        label: "Not mine",
        createdAt: Date.now(),
      }),
    );
    const result = await t.withIdentity(identity).query(api.calendars.queries.listConnections, {});
    expect(result.map((c) => c.label)).toEqual(["Test"]);
  });
});

describe("listEventsInRange", () => {
  test("returns an empty list when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.calendars.queries.listEventsInRange, {
      startsAtMs: 0,
      endsAtMs: 1,
    });
    expect(result).toEqual([]);
  });

  test("returns events that start inside the window", async () => {
    const { t, userId, connectionId } = await setupUserWithConnection();
    const base = Date.UTC(2026, 5, 1);
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        externalId: "inside",
        title: "Inside",
        startsAt: base + 10 * 60 * 1000,
        endsAt: base + 70 * 60 * 1000,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );
    const result = await t.withIdentity(identity).query(api.calendars.queries.listEventsInRange, {
      startsAtMs: base,
      endsAtMs: base + ONE_DAY,
    });
    expect(result.map((e) => e.title)).toEqual(["Inside"]);
  });

  test("includes multi-day events that start before and end inside the window", async () => {
    const { t, userId, connectionId } = await setupUserWithConnection();
    const windowStart = Date.UTC(2026, 5, 10);
    const windowEnd = windowStart + ONE_DAY;
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        externalId: "straddle",
        title: "Retreat",
        startsAt: windowStart - 3 * ONE_DAY,
        endsAt: windowStart + 2 * 60 * 60 * 1000,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );
    const result = await t.withIdentity(identity).query(api.calendars.queries.listEventsInRange, {
      startsAtMs: windowStart,
      endsAtMs: windowEnd,
    });
    expect(result.map((e) => e.title)).toEqual(["Retreat"]);
  });

  test("excludes events that ended before the window", async () => {
    const { t, userId, connectionId } = await setupUserWithConnection();
    const windowStart = Date.UTC(2026, 5, 10);
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        externalId: "past",
        title: "Old",
        startsAt: windowStart - 5 * ONE_DAY,
        endsAt: windowStart - 4 * ONE_DAY,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );
    const result = await t.withIdentity(identity).query(api.calendars.queries.listEventsInRange, {
      startsAtMs: windowStart,
      endsAtMs: windowStart + ONE_DAY,
    });
    expect(result).toEqual([]);
  });

  test("excludes events that start after the window ends", async () => {
    const { t, userId, connectionId } = await setupUserWithConnection();
    const windowStart = Date.UTC(2026, 5, 10);
    const windowEnd = windowStart + ONE_DAY;
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        externalId: "future",
        title: "Later",
        startsAt: windowEnd + ONE_DAY,
        endsAt: windowEnd + 2 * ONE_DAY,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );
    const result = await t.withIdentity(identity).query(api.calendars.queries.listEventsInRange, {
      startsAtMs: windowStart,
      endsAtMs: windowEnd,
    });
    expect(result).toEqual([]);
  });

  test("does not leak another user's events", async () => {
    const { t } = await setupUserWithConnection();
    const otherUser = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "other",
        email: "o@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );
    const otherConnection = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId: otherUser,
        provider: "ical",
        label: "Other",
        createdAt: Date.now(),
      }),
    );
    const base = Date.UTC(2026, 5, 1);
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId: otherUser,
        connectionId: otherConnection,
        externalId: "hidden",
        title: "Hidden",
        startsAt: base,
        endsAt: base + 60 * 60 * 1000,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );
    const result = await t.withIdentity(identity).query(api.calendars.queries.listEventsInRange, {
      startsAtMs: base - ONE_DAY,
      endsAtMs: base + ONE_DAY,
    });
    expect(result).toEqual([]);
  });
});
