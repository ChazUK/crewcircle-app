import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { scheduleDeleteUserCalendarData } from "./cascadeDelete";

const modules = import.meta.glob("/convex/**/*.ts");

async function insertUser(t: TestConvex<typeof schema>, externalAuthId: string) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email: `${externalAuthId}@example.com`,
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function insertConnection(t: TestConvex<typeof schema>, userId: Id<"users">, label: string) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label,
      createdAt: Date.now(),
      color: "#6366f1",
      syncErrorCount: 0,
    }),
  );
}

async function insertSubCalendar(
  t: TestConvex<typeof schema>,
  connectionId: Id<"calendarConnections">,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId: "default",
      label: "Default",
      showAsBusy: true,
    }),
  );
}

async function insertEvent(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  connectionId: Id<"calendarConnections">,
  subCalendarId: Id<"calendarSubCalendars">,
  externalId: string,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarEvents", {
      userId,
      connectionId,
      subCalendarId,
      externalId,
      title: externalId,
      startsAt: Date.now(),
      endsAt: Date.now() + 60_000,
      isAllDay: false,
      updatedAt: Date.now(),
    }),
  );
}

describe("scheduleDeleteUserCalendarData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("does nothing for a user with no connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "lone");
    await t.run((ctx) => scheduleDeleteUserCalendarData(ctx, userId));
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled.every((s) => s.state.kind !== "pending")).toBe(true);
  });

  test("deletes every connection and event owned by the user via scheduled runs", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "target");
    const connectionA = await insertConnection(t, userId, "A");
    const connectionB = await insertConnection(t, userId, "B");
    const subCalA = await insertSubCalendar(t, connectionA);
    const subCalB = await insertSubCalendar(t, connectionB);
    await insertEvent(t, userId, connectionA, subCalA, "a1");
    await insertEvent(t, userId, connectionA, subCalA, "a2");
    await insertEvent(t, userId, connectionB, subCalB, "b1");

    await t.run((ctx) => scheduleDeleteUserCalendarData(ctx, userId));
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const subCalendars = await t.run((ctx) => ctx.db.query("calendarSubCalendars").collect());
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connections).toEqual([]);
    expect(subCalendars).toEqual([]);
    expect(events).toEqual([]);
  });

  test("leaves connections belonging to other users untouched", async () => {
    const t = convexTest(schema, modules);
    const target = await insertUser(t, "target");
    const bystander = await insertUser(t, "bystander");
    await insertConnection(t, target, "mine");
    const keepConnection = await insertConnection(t, bystander, "keep");
    const keepSubCal = await insertSubCalendar(t, keepConnection);
    await insertEvent(t, bystander, keepConnection, keepSubCal, "keep-evt");

    await t.run((ctx) => scheduleDeleteUserCalendarData(ctx, target));
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connections.map((c) => c.label)).toEqual(["keep"]);
    expect(events.map((e) => e.externalId)).toEqual(["keep-evt"]);
  });
});

describe("deleteConnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("schedules the cascade without performing any deletions itself", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId, "Feed");
    const subCalendarId = await insertSubCalendar(t, connectionId);
    await insertEvent(t, userId, connectionId, subCalendarId, "evt-1");

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnection, { connectionId });

    // Before any scheduled work runs, nothing has been deleted.
    const connectionsBefore = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const subCalsBefore = await t.run((ctx) => ctx.db.query("calendarSubCalendars").collect());
    const eventsBefore = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connectionsBefore).toHaveLength(1);
    expect(subCalsBefore).toHaveLength(1);
    expect(eventsBefore).toHaveLength(1);

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const connectionsAfter = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const subCalsAfter = await t.run((ctx) => ctx.db.query("calendarSubCalendars").collect());
    const eventsAfter = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connectionsAfter).toEqual([]);
    expect(subCalsAfter).toEqual([]);
    expect(eventsAfter).toEqual([]);
  });

  test("removes the connection row when there are no sub-calendars", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "empty");
    const connectionId = await insertConnection(t, userId, "Empty");

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnection, { connectionId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    expect(connections).toEqual([]);
  });

  test("does not affect events from other connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "shared");
    const targetConnection = await insertConnection(t, userId, "Target");
    const otherConnection = await insertConnection(t, userId, "Other");
    const targetSubCal = await insertSubCalendar(t, targetConnection);
    const otherSubCal = await insertSubCalendar(t, otherConnection);
    await insertEvent(t, userId, targetConnection, targetSubCal, "tgt-1");
    await insertEvent(t, userId, otherConnection, otherSubCal, "other-1");
    await insertEvent(t, userId, otherConnection, otherSubCal, "other-2");

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnection, {
      connectionId: targetConnection,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const remainingEvents = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    const remainingConnections = await t.run((ctx) =>
      ctx.db.query("calendarConnections").collect(),
    );
    expect(remainingConnections.map((c) => c.label)).toEqual(["Other"]);
    expect(remainingEvents.map((e) => e.externalId).sort()).toEqual(["other-1", "other-2"]);
  });

  test("paginates event deletion across multiple scheduled runs for large sub-calendars", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "huge");
    const connectionId = await insertConnection(t, userId, "Huge");
    const subCalendarId = await insertSubCalendar(t, connectionId);
    // Schedule 1,200 events — more than one discovery cycle (1,000) so we
    // exercise the cursor-based continuation branch of deleteConnectionEvents.
    for (let i = 0; i < 1200; i++) {
      await insertEvent(t, userId, connectionId, subCalendarId, `evt-${i}`);
    }

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnection, { connectionId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    expect(events).toEqual([]);
    expect(connections).toEqual([]);
  });
});

describe("deleteConnectionEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("deletes events for a sub-calendar without touching others", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId, "Feed");
    const targetSubCal = await insertSubCalendar(t, connectionId);
    const otherSubCal = await t.run((ctx) =>
      ctx.db.insert("calendarSubCalendars", {
        connectionId,
        externalId: "secondary",
        label: "Secondary",
        showAsBusy: true,
      }),
    );
    await insertEvent(t, userId, connectionId, targetSubCal, "tgt-1");
    await insertEvent(t, userId, connectionId, targetSubCal, "tgt-2");
    await insertEvent(t, userId, connectionId, otherSubCal, "other-1");

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
      subCalendarId: targetSubCal,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events.map((e) => e.externalId)).toEqual(["other-1"]);
  });

  test("paginates with cursor continuations for sub-calendars exceeding one discovery cycle", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId, "Feed");
    const subCalendarId = await insertSubCalendar(t, connectionId);
    for (let i = 0; i < 1200; i++) {
      await insertEvent(t, userId, connectionId, subCalendarId, `evt-${i}`);
    }

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
      subCalendarId,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const events = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("bySubCalendar", (q) => q.eq("subCalendarId", subCalendarId))
        .collect(),
    );
    expect(events).toEqual([]);
  });

  test("does nothing when the sub-calendar has no events", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId, "Feed");
    const subCalendarId = await insertSubCalendar(t, connectionId);

    await t.mutation(internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
      subCalendarId,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toEqual([]);
  });
});
