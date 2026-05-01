import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

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
  test("does nothing for a user with no connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "lone");
    await t.run((ctx) => scheduleDeleteUserCalendarData(ctx, userId));
    await new Promise((r) => setTimeout(r, 0));
    await t.finishAllScheduledFunctions(() => {});
    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    // Every scheduled run has completed (or none were enqueued).
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
    await new Promise((r) => setTimeout(r, 0));
    await t.finishAllScheduledFunctions(() => {});

    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connections).toEqual([]);
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
    await new Promise((r) => setTimeout(r, 0));
    await t.finishAllScheduledFunctions(() => {});

    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connections.map((c) => c.label)).toEqual(["keep"]);
    expect(events.map((e) => e.externalId)).toEqual(["keep-evt"]);
  });
});
