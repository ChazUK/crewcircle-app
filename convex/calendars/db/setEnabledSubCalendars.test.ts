/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

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

async function insertConnection(t: TestConvex<typeof schema>, userId: Id<"users">) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "google",
      label: "Work",
      createdAt: Date.now(),
      color: "#6366f1",
      syncErrorCount: 0,
    }),
  );
}

async function insertSubCalendar(
  t: TestConvex<typeof schema>,
  connectionId: Id<"calendarConnections">,
  externalId: string,
  label: string,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId,
      label,
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

describe("setEnabledSubCalendars", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("inserts a row with showAsBusy=true for each newly selected sub-calendar", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [
        { externalId: "work@example.com", label: "Work" },
        { externalId: "personal@example.com", label: "Personal" },
      ],
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.showAsBusy === true)).toBe(true);
    expect(rows.map((r) => r.externalId).sort()).toEqual([
      "personal@example.com",
      "work@example.com",
    ]);
  });

  test("leaves an existing row untouched when its externalId is still selected", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    const existingId = await insertSubCalendar(t, connectionId, "work@example.com", "Work");

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [{ externalId: "work@example.com", label: "Work" }],
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe(existingId);
  });

  test("does not overwrite a custom showAsBusy=false on an unchanged row", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    const existingId = await t.run((ctx) =>
      ctx.db.insert("calendarSubCalendars", {
        connectionId,
        externalId: "work@example.com",
        label: "Work",
        showAsBusy: false,
      }),
    );

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [{ externalId: "work@example.com", label: "Work" }],
    });

    const row = await t.run((ctx) => ctx.db.get(existingId));
    expect(row?.showAsBusy).toBe(false);
  });

  test("deletes rows whose externalId is no longer in the selection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    await insertSubCalendar(t, connectionId, "work@example.com", "Work");
    await insertSubCalendar(t, connectionId, "old@example.com", "Old");

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [{ externalId: "work@example.com", label: "Work" }],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows.map((r) => r.externalId)).toEqual(["work@example.com"]);
  });

  test("schedules deleteConnectionEvents for each removed sub-calendar so its events drain", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    const removed = await insertSubCalendar(t, connectionId, "old@example.com", "Old");
    const kept = await insertSubCalendar(t, connectionId, "work@example.com", "Work");
    await insertEvent(t, userId, connectionId, removed, "removed-evt-1");
    await insertEvent(t, userId, connectionId, removed, "removed-evt-2");
    await insertEvent(t, userId, connectionId, kept, "kept-evt");

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [{ externalId: "work@example.com", label: "Work" }],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events.map((e) => e.externalId)).toEqual(["kept-evt"]);
  });

  test("removes every row when the selection is empty", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    const oldA = await insertSubCalendar(t, connectionId, "a@example.com", "A");
    const oldB = await insertSubCalendar(t, connectionId, "b@example.com", "B");
    await insertEvent(t, userId, connectionId, oldA, "a-1");
    await insertEvent(t, userId, connectionId, oldB, "b-1");

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(rows).toEqual([]);
    expect(events).toEqual([]);
  });

  test("does not touch sub-calendars that belong to a different connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    const otherConnectionId = await insertConnection(t, userId);
    const otherRow = await insertSubCalendar(t, otherConnectionId, "other@example.com", "Other");

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [{ externalId: "new@example.com", label: "New" }],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const stillThere = await t.run((ctx) => ctx.db.get(otherRow));
    expect(stillThere).not.toBeNull();
  });

  test("dedupes selections by externalId so duplicates do not insert duplicate rows", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [
        { externalId: "work@example.com", label: "Work" },
        { externalId: "work@example.com", label: "Work (duplicate)" },
        { externalId: "personal@example.com", label: "Personal" },
      ],
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows.map((r) => r.externalId).sort()).toEqual([
      "personal@example.com",
      "work@example.com",
    ]);
    // Last entry wins for the duplicated externalId.
    const work = rows.find((r) => r.externalId === "work@example.com");
    expect(work?.label).toBe("Work (duplicate)");
  });

  test("performs both adds and removals in a single call", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "owner");
    const connectionId = await insertConnection(t, userId);
    await insertSubCalendar(t, connectionId, "keep@example.com", "Keep");
    await insertSubCalendar(t, connectionId, "drop@example.com", "Drop");

    await t.mutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
      connectionId,
      selections: [
        { externalId: "keep@example.com", label: "Keep" },
        { externalId: "new@example.com", label: "New" },
      ],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows.map((r) => r.externalId).sort()).toEqual(["keep@example.com", "new@example.com"]);
  });
});
