import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { fetchSortedMemberships } from "./fetchSortedMemberships";

const modules = import.meta.glob("../../**/*.ts");

async function insertCrewUser(t: TestConvex<typeof schema>, email: string): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: `clerk_${email}`,
      email,
      hasCompletedOnboarding: true,
      userType: "crew",
      isPublic: false,
    }),
  );
}

describe("fetchSortedMemberships", () => {
  test("sorts alphabetically by name", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertCrewUser(t, "alice@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId, name: "Zimmer" });
      await ctx.db.insert("memberships", { userId, name: "Alpha" });
      await ctx.db.insert("memberships", { userId, name: "Middle" });
    });

    const result = await t.run((ctx) => fetchSortedMemberships(ctx, userId));

    expect(result.map((r) => r.name)).toEqual(["Alpha", "Middle", "Zimmer"]);
  });

  test("returns empty array when no memberships exist", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertCrewUser(t, "bob@example.com");

    const result = await t.run((ctx) => fetchSortedMemberships(ctx, userId));

    expect(result).toEqual([]);
  });

  test("maps fields correctly", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertCrewUser(t, "carol@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId, name: "BECTU", memberNumber: "12345" });
    });

    const result = await t.run((ctx) => fetchSortedMemberships(ctx, userId));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "BECTU",
      memberNumber: "12345",
    });
    expect(result[0].id).toBeDefined();
  });
});
