import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "../../schema";
import { upsertUser } from "./upsertUser";

const modules = import.meta.glob("../../**/*.ts");

describe("upsertUser", () => {
  test("inserts a new user and returns their id", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      upsertUser(ctx, { externalAuthId: "clerk_new", email: "new@example.com" }),
    );
    expect(id).toBeDefined();
  });

  test("returns existing id on repeat call (idempotent)", async () => {
    const t = convexTest(schema, modules);
    const args = { externalAuthId: "clerk_dupe", email: "dupe@example.com" };
    const first = await t.run((ctx) => upsertUser(ctx, args));
    const second = await t.run((ctx) => upsertUser(ctx, args));
    expect(first).toEqual(second);
  });

  test("sets hasCompletedOnboarding and isPublic to false on creation", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      upsertUser(ctx, { externalAuthId: "clerk_defaults", email: "defaults@example.com" }),
    );
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.hasCompletedOnboarding).toBe(false);
    expect(user?.isPublic).toBe(false);
  });

  test("persists all optional fields", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      upsertUser(ctx, {
        externalAuthId: "clerk_full",
        email: "full@example.com",
        firstName: "Full",
        lastName: "User",
      }),
    );
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.firstName).toBe("Full");
    expect(user?.lastName).toBe("User");
  });
});
