import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "../../schema";
import { createUser, deleteUser, updateUser } from "./syncUser";

const modules = import.meta.glob("../../**/*.ts");

describe("createUser", () => {
  test("inserts a new user and returns their id", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      createUser(ctx, { externalAuthId: "clerk_wh_1", email: "webhook@example.com" }),
    );
    expect(id).toBeDefined();
  });

  test("returns existing id if called twice with same externalAuthId (idempotent)", async () => {
    const t = convexTest(schema, modules);
    const args = { externalAuthId: "clerk_wh_2", email: "existing@example.com" };
    const first = await t.run((ctx) => createUser(ctx, args));
    const second = await t.run((ctx) => createUser(ctx, args));
    expect(first).toEqual(second);
  });
});

describe("updateUser", () => {
  test("patches the matched user's fields", async () => {
    const t = convexTest(schema, modules);
    const externalAuthId = "clerk_upd_1";
    await t.run((ctx) => createUser(ctx, { externalAuthId, email: "before@example.com" }));
    await t.run((ctx) =>
      updateUser(ctx, { externalAuthId, email: "after@example.com", firstName: "Updated" }),
    );
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", externalAuthId))
        .unique(),
    );
    expect(user?.email).toBe("after@example.com");
    expect(user?.firstName).toBe("Updated");
  });

  test("does not overwrite fields when value is undefined", async () => {
    const t = convexTest(schema, modules);
    const externalAuthId = "clerk_upd_2";
    await t.run((ctx) =>
      createUser(ctx, { externalAuthId, email: "keep@example.com", firstName: "KeepMe" }),
    );
    await t.run((ctx) => updateUser(ctx, { externalAuthId, email: "changed@example.com" }));
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", externalAuthId))
        .unique(),
    );
    expect(user?.firstName).toBe("KeepMe");
  });

  test("returns null when user does not exist", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run((ctx) =>
      updateUser(ctx, { externalAuthId: "nonexistent", email: "ghost@example.com" }),
    );
    expect(result).toBeNull();
  });
});

describe("deleteUser", () => {
  test("removes the user from the database", async () => {
    const t = convexTest(schema, modules);
    const externalAuthId = "clerk_del_1";
    await t.run((ctx) => createUser(ctx, { externalAuthId, email: "delete@example.com" }));
    await t.run((ctx) => deleteUser(ctx, { externalAuthId }));
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", externalAuthId))
        .unique(),
    );
    expect(user).toBeNull();
  });

  test("returns null when user does not exist", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run((ctx) => deleteUser(ctx, { externalAuthId: "nonexistent" }));
    expect(result).toBeNull();
  });

  test("cascades to the user's calendar connections and cached events", async () => {
    const t = convexTest(schema, modules);
    const externalAuthId = "clerk_del_cascade";
    const userId = await t.run((ctx) =>
      createUser(ctx, { externalAuthId, email: "cascade@example.com" }),
    );
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "Feed",
        createdAt: Date.now(),
        color: "#6366f1",
        syncErrorCount: 0,
      }),
    );
    const subCalendarId = await t.run((ctx) =>
      ctx.db.insert("calendarSubCalendars", {
        connectionId,
        externalId: "default",
        label: "Default",
        showAsBusy: true,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId,
        connectionId,
        subCalendarId,
        externalId: "evt-1",
        title: "Meeting",
        startsAt: Date.now(),
        endsAt: Date.now() + 60_000,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );

    await t.run((ctx) => deleteUser(ctx, { externalAuthId }));
    await new Promise((r) => setTimeout(r, 0));
    await t.finishAllScheduledFunctions(() => {});

    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(connections).toEqual([]);
    expect(events).toEqual([]);
  });

  test("does not schedule any cleanup when the user does not exist", async () => {
    const t = convexTest(schema, modules);
    // Seed an unrelated user+connection so we can verify it survives.
    const survivorId = await t.run((ctx) =>
      createUser(ctx, { externalAuthId: "survivor", email: "s@example.com" }),
    );
    await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId: survivorId,
        provider: "ical",
        label: "Untouched",
        createdAt: Date.now(),
        color: "#6366f1",
        syncErrorCount: 0,
      }),
    );
    await t.run((ctx) => deleteUser(ctx, { externalAuthId: "nope" }));
    await new Promise((r) => setTimeout(r, 0));
    await t.finishAllScheduledFunctions(() => {});
    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    expect(connections.map((c) => c.label)).toEqual(["Untouched"]);
  });
});
