import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { getConnectionById, listConnectionsByUser } from "./getConnection";

const modules = import.meta.glob("../../**/*.ts");

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

describe("getConnectionById", () => {
  test("returns null when the connection does not exist", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run((ctx) =>
      getConnectionById(ctx, "jn7b4r8ape7qfmtkxbwj8d5j8h6x4yhg" as Id<"calendarConnections">),
    );
    expect(result).toBeNull();
  });

  test("returns the connection when it exists", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user-a");
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "Holidays",
        icalUrl: "https://example.com/feed.ics",
        createdAt: Date.now(),
      }),
    );
    const result = await t.run((ctx) => getConnectionById(ctx, connectionId));
    expect(result?.label).toBe("Holidays");
  });
});

describe("listConnectionsByUser", () => {
  test("returns an empty list when the user has no connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user-solo");
    const result = await t.run((ctx) => listConnectionsByUser(ctx, userId));
    expect(result).toEqual([]);
  });

  test("returns only the connections owned by the given user", async () => {
    const t = convexTest(schema, modules);
    const alice = await insertUser(t, "alice");
    const bob = await insertUser(t, "bob");

    await t.run(async (ctx) => {
      await ctx.db.insert("calendarConnections", {
        userId: alice,
        provider: "ical",
        label: "A1",
        createdAt: Date.now(),
      });
      await ctx.db.insert("calendarConnections", {
        userId: alice,
        provider: "ical",
        label: "A2",
        createdAt: Date.now(),
      });
      await ctx.db.insert("calendarConnections", {
        userId: bob,
        provider: "ical",
        label: "B1",
        createdAt: Date.now(),
      });
    });

    const aliceConnections = await t.run((ctx) => listConnectionsByUser(ctx, alice));
    expect(aliceConnections.map((c) => c.label).sort()).toEqual(["A1", "A2"]);
  });
});
