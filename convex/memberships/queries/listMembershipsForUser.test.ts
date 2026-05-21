/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const aliceIdentity = {
  subject: "clerk_alice",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_alice",
};

const bobIdentity = {
  subject: "clerk_bob",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_bob",
};

async function insertCrewUser(
  t: TestConvex<typeof schema>,
  externalAuthId: string,
  email: string,
  opts?: { isPublic?: boolean },
): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email,
      hasCompletedOnboarding: true,
      userType: "crew",
      isPublic: opts?.isPublic ?? false,
    }),
  );
}

describe("listMembershipsForUser", () => {
  test("self returns rows sorted alphabetically", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId: aliceId, name: "GBCT" });
      await ctx.db.insert("memberships", { userId: aliceId, name: "BECTU", memberNumber: "12345" });
      await ctx.db.insert("memberships", { userId: aliceId, name: "BSC" });
    });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.memberships.queries.listMembershipsForUser.listMembershipsForUser, {
        userId: aliceId,
      });

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("BECTU");
    expect(result[0].memberNumber).toBe("12345");
    expect(result[1].name).toBe("BSC");
    expect(result[2].name).toBe("GBCT");
  });

  test("contact returns rows", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");
    const bobId = await insertCrewUser(t, bobIdentity.subject, "bob@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId: aliceId, name: "BECTU" });
      await ctx.db.insert("contacts", {
        ownerId: bobId,
        contactUserId: aliceId,
        createdAt: Date.now(),
      });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.memberships.queries.listMembershipsForUser.listMembershipsForUser, {
        userId: aliceId,
      });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("BECTU");
  });

  test("public-card returns empty array", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com", {
      isPublic: true,
    });
    await insertCrewUser(t, bobIdentity.subject, "bob@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId: aliceId, name: "BECTU" });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.memberships.queries.listMembershipsForUser.listMembershipsForUser, {
        userId: aliceId,
      });

    expect(result).toEqual([]);
  });

  test("hidden returns empty array", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com", {
      isPublic: false,
    });
    await insertCrewUser(t, bobIdentity.subject, "bob@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId: aliceId, name: "BECTU" });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.memberships.queries.listMembershipsForUser.listMembershipsForUser, {
        userId: aliceId,
      });

    expect(result).toEqual([]);
  });

  test("alphabetical order is verified", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", { userId: aliceId, name: "Zimmer" });
      await ctx.db.insert("memberships", { userId: aliceId, name: "Alpha" });
      await ctx.db.insert("memberships", { userId: aliceId, name: "Middle" });
    });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.memberships.queries.listMembershipsForUser.listMembershipsForUser, {
        userId: aliceId,
      });

    expect(result.map((r) => r.name)).toEqual(["Alpha", "Middle", "Zimmer"]);
  });
});
