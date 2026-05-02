/// <reference types="vite/client" />
import type { IncomingEvent, SyncWindow } from "@shared/calendars";
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const WINDOW: SyncWindow = {
  windowStartMs: 1_000_000,
  windowEndMs: 2_000_000,
};

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

async function insertConnection(t: TestConvex<typeof schema>, userId: Id<"users">) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label: "Test calendar",
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

function makeEvent(externalId: string, startsAt: number, overrides: Partial<IncomingEvent> = {}) {
  return {
    externalId,
    title: `Event ${externalId}`,
    startsAt,
    endsAt: startsAt + 60 * 60 * 1000,
    isAllDay: false,
    ...overrides,
  };
}

async function setup(t: TestConvex<typeof schema>) {
  const userId = await insertUser(t, "owner");
  const connectionId = await insertConnection(t, userId);
  const subCalendarId = await insertSubCalendar(t, connectionId);
  return { userId, connectionId, subCalendarId };
}

describe("writeEvents", () => {
  test("inserts a new event row", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId, userId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-1", 1_500_000)],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      externalId: "evt-1",
      title: "Event evt-1",
      connectionId,
      subCalendarId,
      userId,
      startsAt: 1_500_000,
      isAllDay: false,
    });
    expect(events[0].updatedAt).toBeTypeOf("number");
  });

  test("upsert is idempotent — running twice produces a single row per external id", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);
    const event = makeEvent("evt-1", 1_500_000);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [event],
    });
    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [event],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toHaveLength(1);
  });

  test("updates existing row when re-upserting with new title", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-1", 1_500_000, { title: "Original" })],
    });
    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-1", 1_500_000, { title: "Updated" })],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Updated");
  });

  test("prunes events within the sync window that are missing from the new batch", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-keep", 1_500_000), makeEvent("evt-drop", 1_600_000)],
    });

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-keep", 1_500_000)],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events.map((e) => e.externalId)).toEqual(["evt-keep"]);
  });

  test("does NOT prune events whose startsAt falls outside the sync window", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId, userId } = await setup(t);

    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        subCalendarId,
        externalId: "evt-before",
        title: "Before window",
        startsAt: WINDOW.windowStartMs - 1_000,
        endsAt: WINDOW.windowStartMs - 500,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        subCalendarId,
        externalId: "evt-after",
        title: "After window",
        startsAt: WINDOW.windowEndMs + 1_000,
        endsAt: WINDOW.windowEndMs + 1_500,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-in-window", 1_500_000)],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    const ids = events.map((e) => e.externalId).sort();
    expect(ids).toEqual(["evt-after", "evt-before", "evt-in-window"]);
  });

  test("prune only affects the supplied subCalendar — leaves other sub-calendars alone", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId, userId } = await setup(t);
    const otherSubCalendarId = await t.run((ctx) =>
      ctx.db.insert("calendarSubCalendars", {
        connectionId,
        externalId: "other",
        label: "Other",
        showAsBusy: true,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        subCalendarId: otherSubCalendarId,
        externalId: "other-evt",
        title: "Other",
        startsAt: 1_500_000,
        endsAt: 1_600_000,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events.map((e) => e.externalId)).toEqual(["other-evt"]);
  });

  test("deletedExternalIds removes the matching rows for the connection", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-keep", 1_500_000), makeEvent("evt-tombstoned", 1_600_000)],
    });

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-keep", 1_500_000), makeEvent("evt-tombstoned", 1_600_000)],
      deletedExternalIds: ["evt-tombstoned"],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events.map((e) => e.externalId)).toEqual(["evt-keep"]);
  });

  test("deletedExternalIds is scoped to the connection — leaves other connections alone", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionA = await insertConnection(t, userId);
    const connectionB = await insertConnection(t, userId);
    const subA = await insertSubCalendar(t, connectionA);
    const subB = await insertSubCalendar(t, connectionB);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId: connectionA,
      subCalendarId: subA,
      syncWindow: WINDOW,
      events: [makeEvent("shared-id", 1_500_000)],
    });
    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId: connectionB,
      subCalendarId: subB,
      syncWindow: WINDOW,
      events: [makeEvent("shared-id", 1_500_000)],
    });

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId: connectionA,
      subCalendarId: subA,
      syncWindow: WINDOW,
      events: [],
      deletedExternalIds: ["shared-id"],
    });

    const remaining = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(remaining).toHaveLength(1);
    expect(remaining[0].connectionId).toBe(connectionB);
  });

  test("userId is sourced from the connection row, not from any caller-supplied value", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId, userId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-1", 1_500_000)],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events[0].userId).toBe(userId);
  });

  test("throws when connection does not exist", async () => {
    const t = convexTest(schema, modules);
    const { subCalendarId } = await setup(t);
    const fakeConnectionId = "k1234567890abcdefghij" as Id<"calendarConnections">;

    await expect(
      t.mutation(internal.calendars.db.writeEvents.writeEvents, {
        connectionId: fakeConnectionId,
        subCalendarId,
        syncWindow: WINDOW,
        events: [makeEvent("evt-1", 1_500_000)],
      }),
    ).rejects.toThrow();
  });

  test("throws when called with more than 200 events", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);
    const events = Array.from({ length: 201 }, (_, i) =>
      makeEvent(`evt-${i}`, 1_500_000 + i * 1_000),
    );

    await expect(
      t.mutation(internal.calendars.db.writeEvents.writeEvents, {
        connectionId,
        subCalendarId,
        syncWindow: WINDOW,
        events,
      }),
    ).rejects.toThrow();
  });

  test("persists optional fields (uid, recurrenceId, description, location)", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [
        makeEvent("evt-1", 1_500_000, {
          uid: "uid-1",
          recurrenceId: 1_500_000,
          description: "A description",
          location: "London",
        }),
      ],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events[0]).toMatchObject({
      uid: "uid-1",
      recurrenceId: 1_500_000,
      description: "A description",
      location: "London",
    });
  });

  test("clears optional fields when the new event no longer carries them", async () => {
    const t = convexTest(schema, modules);
    const { connectionId, subCalendarId } = await setup(t);

    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [
        makeEvent("evt-1", 1_500_000, {
          description: "First version",
          location: "London",
        }),
      ],
    });
    await t.mutation(internal.calendars.db.writeEvents.writeEvents, {
      connectionId,
      subCalendarId,
      syncWindow: WINDOW,
      events: [makeEvent("evt-1", 1_500_000)],
    });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events[0].description).toBeUndefined();
    expect(events[0].location).toBeUndefined();
  });
});
