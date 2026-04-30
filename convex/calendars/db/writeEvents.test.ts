import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { deleteConnectionEvents, replaceConnectionEvents } from "./writeEvents";

const modules = import.meta.glob("../../**/*.ts");

type HarnessContext = {
  t: TestConvex<typeof schema>;
  userId: Id<"users">;
  connectionId: Id<"calendarConnections">;
};

async function makeHarness(): Promise<HarnessContext> {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "user-x",
      email: "x@example.com",
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

function event(externalId: string, title = externalId) {
  return {
    externalId,
    title,
    startsAt: Date.now(),
    endsAt: Date.now() + 60 * 60 * 1000,
    isAllDay: false,
  };
}

describe("replaceConnectionEvents", () => {
  test("inserts new events on first sync", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("a"), event("b")],
      }),
    );
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows.map((r) => r.externalId).sort()).toEqual(["a", "b"]);
  });

  test("updates events whose externalId already exists", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("a", "old title")],
      }),
    );
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("a", "new title")],
      }),
    );
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("new title");
  });

  test("deletes events that are no longer in the incoming set", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("a"), event("b")],
      }),
    );
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, { connectionId, userId, events: [event("a")] }),
    );
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows.map((r) => r.externalId)).toEqual(["a"]);
  });

  test("dedupes when the incoming batch contains the same externalId twice", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("dup", "first"), event("dup", "second")],
      }),
    );
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    // Latest value in the batch wins.
    expect(rows[0].title).toBe("second");
  });

  test("empty batch removes all existing events for the connection", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("a"), event("b"), event("c")],
      }),
    );
    await t.run((ctx) => replaceConnectionEvents(ctx, { connectionId, userId, events: [] }));
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  test("mixed batch inserts, updates, and deletes in one call", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("keep", "original"), event("update-me", "old"), event("delete-me")],
      }),
    );
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: [event("keep", "original"), event("update-me", "new"), event("brand-new")],
      }),
    );
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    const byId = Object.fromEntries(rows.map((r) => [r.externalId, r]));
    expect(Object.keys(byId).sort()).toEqual(["brand-new", "keep", "update-me"]);
    expect(byId["delete-me"]).toBeUndefined();
    expect(byId["update-me"].title).toBe("new");
    expect(byId["brand-new"].title).toBe("brand-new");
  });

  test("does not touch events on other connections", async () => {
    const { t, userId, connectionId } = await makeHarness();
    const otherConnectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "Other",
        createdAt: Date.now(),
      }),
    );
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId: otherConnectionId,
        userId,
        events: [event("keepme")],
      }),
    );
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, { connectionId, userId, events: [event("a")] }),
    );
    const otherRows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", otherConnectionId))
        .collect(),
    );
    expect(otherRows.map((r) => r.externalId)).toEqual(["keepme"]);
  });
});

describe("deleteConnectionEvents", () => {
  test("removes every event tied to the connection", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run((ctx) =>
      replaceConnectionEvents(ctx, {
        connectionId,
        userId,
        events: Array.from({ length: 5 }, (_, i) => event(`e${i}`)),
      }),
    );
    await t.run((ctx) => deleteConnectionEvents(ctx, connectionId, null));
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toEqual([]);
  });

  test("is a no-op when the connection has no events", async () => {
    const { t, connectionId } = await makeHarness();
    const { done } = await t.run((ctx) => deleteConnectionEvents(ctx, connectionId, null));
    expect(done).toBe(true);
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toEqual([]);
  });

  test("returns done:false and a cursor when more than 200 events remain", async () => {
    const { t, userId, connectionId } = await makeHarness();
    await t.run(async (ctx) => {
      for (let i = 0; i < 201; i++) {
        await ctx.db.insert("calendarEvents", {
          userId,
          connectionId,
          externalId: `e${i}`,
          title: `event-${i}`,
          startsAt: Date.now(),
          endsAt: Date.now() + 60_000,
          isAllDay: false,
          updatedAt: Date.now(),
        });
      }
    });

    const first = await t.run((ctx) => deleteConnectionEvents(ctx, connectionId, null));
    expect(first.done).toBe(false);

    const second = await t.run((ctx) =>
      deleteConnectionEvents(ctx, connectionId, first.continueCursor),
    );
    expect(second.done).toBe(true);

    const remaining = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(remaining).toEqual([]);
  });
});
