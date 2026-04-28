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
    await t.run((ctx) => deleteConnectionEvents(ctx, connectionId));
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
    await t.run((ctx) => deleteConnectionEvents(ctx, connectionId));
    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toEqual([]);
  });
});
