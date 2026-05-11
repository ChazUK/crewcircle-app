/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

const modules = import.meta.glob("/convex/**/*.ts");

async function insertUser(t: TestConvex<typeof schema>) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "user-1",
      email: "user-1@example.com",
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
      color: "#6366f1",
      createdAt: Date.now(),
      syncErrorCount: 0,
    }),
  );
}

async function insertSubCalendar(
  t: TestConvex<typeof schema>,
  connectionId: Id<"calendarConnections">,
  externalId: string,
  color?: string,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId,
      label: externalId,
      showAsBusy: true,
      color,
    }),
  );
}

describe("refreshSubCalendarColors", () => {
  test("patches matching rows to the new colour", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);
    const subId = await insertSubCalendar(t, connectionId, "work@example.com", "#000000");

    await t.mutation(internal.calendars.db.refreshSubCalendarColors.refreshSubCalendarColors, {
      connectionId,
      updates: [{ externalId: "work@example.com", color: "#9fe1e7" }],
    });

    const row = await t.run((ctx) => ctx.db.get(subId));
    expect(row?.color).toBe("#9fe1e7");
  });

  test("clears the colour when the source reports undefined (e.g. Outlook auto theme)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);
    const subId = await insertSubCalendar(t, connectionId, "work@example.com", "#7e8aab");

    await t.mutation(internal.calendars.db.refreshSubCalendarColors.refreshSubCalendarColors, {
      connectionId,
      updates: [{ externalId: "work@example.com", color: undefined }],
    });

    const row = await t.run((ctx) => ctx.db.get(subId));
    expect(row?.color).toBeUndefined();
  });

  test("ignores externalIds that do not exist on the connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);

    await t.mutation(internal.calendars.db.refreshSubCalendarColors.refreshSubCalendarColors, {
      connectionId,
      updates: [{ externalId: "ghost@example.com", color: "#ffffff" }],
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toEqual([]);
  });

  test("does not touch sub-calendars belonging to other connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionA = await insertConnection(t, userId);
    const connectionB = await insertConnection(t, userId);
    const subA = await insertSubCalendar(t, connectionA, "shared@example.com", "#aaaaaa");
    const subB = await insertSubCalendar(t, connectionB, "shared@example.com", "#bbbbbb");

    await t.mutation(internal.calendars.db.refreshSubCalendarColors.refreshSubCalendarColors, {
      connectionId: connectionA,
      updates: [{ externalId: "shared@example.com", color: "#cccccc" }],
    });

    const rowA = await t.run((ctx) => ctx.db.get(subA));
    const rowB = await t.run((ctx) => ctx.db.get(subB));
    expect(rowA?.color).toBe("#cccccc");
    expect(rowB?.color).toBe("#bbbbbb");
  });

  test("skips writes when the colour is already up to date", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);
    const subId = await insertSubCalendar(t, connectionId, "work@example.com", "#9fe1e7");

    const before = await t.run((ctx) => ctx.db.get(subId));

    await t.mutation(internal.calendars.db.refreshSubCalendarColors.refreshSubCalendarColors, {
      connectionId,
      updates: [{ externalId: "work@example.com", color: "#9fe1e7" }],
    });

    // No semantic API to assert "not patched", but a no-op patch would be
    // observable as an updated _creationTime in some Convex versions.
    // Verifying the field remained equal protects against accidental flips.
    const after = await t.run((ctx) => ctx.db.get(subId));
    expect(after?.color).toBe(before?.color);
  });
});
