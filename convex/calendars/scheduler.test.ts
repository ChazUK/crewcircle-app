import { CalendarProviderType } from "@shared/calendars";
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

async function insertUser(t: TestConvex<typeof schema>) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "test-user",
      email: "test@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function insertConnection(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  provider: CalendarProviderType,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider,
      label: `${provider} calendar`,
      color: "#6366f1",
      createdAt: 0,
      syncErrorCount: 0,
    }),
  );
}

async function listScheduledSyncs(t: TestConvex<typeof schema>) {
  const all = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  return all.filter((row) => row.name === "calendars/syncWithRetry:syncWithRetry");
}

describe("syncAllConnections", () => {
  // Fake timers prevent scheduled setTimeout callbacks from firing after the
  // mutation transaction closes, which would cause "write outside transaction"
  // errors in convex-test's DatabaseFake.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("schedules nothing when there are no connections", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});
    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(0);
  });

  test("skips native connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await insertConnection(t, userId, "native");

    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});

    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(0);
  });

  test("schedules syncWithRetry for a google connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, "google");

    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});

    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].args).toEqual([{ connectionId }]);
  });

  test("schedules syncWithRetry for a microsoft connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, "microsoft");

    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});

    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].args).toEqual([{ connectionId }]);
  });

  test("schedules syncWithRetry for an ical connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, "ical");

    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});

    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].args).toEqual([{ connectionId }]);
  });

  test("schedules only non-native connections from a mixed set", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);

    await insertConnection(t, userId, "native");
    const googleId = await insertConnection(t, userId, "google");
    const icalId = await insertConnection(t, userId, "ical");

    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});

    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(2);
    const scheduledIds = scheduled.map(
      (s) => (s.args as [{ connectionId: string }])[0].connectionId,
    );
    expect(scheduledIds).toContain(googleId);
    expect(scheduledIds).toContain(icalId);
  });

  test("schedules connections across multiple users", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await insertUser(t);
    const userId2 = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "user-2",
        email: "user2@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );

    const conn1 = await insertConnection(t, userId1, "google");
    const conn2 = await insertConnection(t, userId2, "microsoft");
    await insertConnection(t, userId2, "native");

    await t.mutation(internal.calendars.scheduler.syncAllConnections, {});

    const scheduled = await listScheduledSyncs(t);
    expect(scheduled).toHaveLength(2);
    const scheduledIds = scheduled.map(
      (s) => (s.args as [{ connectionId: string }])[0].connectionId,
    );
    expect(scheduledIds).toContain(conn1);
    expect(scheduledIds).toContain(conn2);
  });
});
