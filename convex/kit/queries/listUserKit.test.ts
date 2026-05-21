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

async function insertKitForUser(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  names: string[],
) {
  await t.run(async (ctx) => {
    for (const name of names) {
      const normalizedName = name.trim().replace(/\s+/g, " ").toLowerCase();
      let catalogue = await ctx.db
        .query("kitCatalogue")
        .withIndex("byNormalizedName", (q) => q.eq("normalizedName", normalizedName))
        .unique();
      if (!catalogue) {
        const id = await ctx.db.insert("kitCatalogue", { name, normalizedName });
        catalogue = (await ctx.db.get(id))!;
      }
      await ctx.db.insert("userKit", { userId, kitCatalogueId: catalogue._id });
    }
  });
}

describe("listUserKit", () => {
  test("self returns rows sorted alphabetically", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");
    await insertKitForUser(t, aliceId, ["RED Komodo", "Arri Alexa Mini", "Sony FX6"]);

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.kit.queries.listUserKit.listUserKit, { userId: aliceId });

    expect(result).toHaveLength(3);
    expect(result[0]!.name).toBe("Arri Alexa Mini");
    expect(result[1]!.name).toBe("RED Komodo");
    expect(result[2]!.name).toBe("Sony FX6");
  });

  test("contact returns rows", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");
    const bobId = await insertCrewUser(t, bobIdentity.subject, "bob@example.com");
    await insertKitForUser(t, aliceId, ["Arri Alexa Mini"]);

    await t.run(async (ctx) => {
      await ctx.db.insert("contacts", {
        ownerId: bobId,
        contactUserId: aliceId,
        createdAt: Date.now(),
      });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.kit.queries.listUserKit.listUserKit, { userId: aliceId });

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Arri Alexa Mini");
  });

  test("public-card returns empty array", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com", {
      isPublic: true,
    });
    await insertCrewUser(t, bobIdentity.subject, "bob@example.com");
    await insertKitForUser(t, aliceId, ["Arri Alexa Mini"]);

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.kit.queries.listUserKit.listUserKit, { userId: aliceId });

    expect(result).toEqual([]);
  });

  test("hidden returns empty array", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com", {
      isPublic: false,
    });
    await insertCrewUser(t, bobIdentity.subject, "bob@example.com");
    await insertKitForUser(t, aliceId, ["Arri Alexa Mini"]);

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.kit.queries.listUserKit.listUserKit, { userId: aliceId });

    expect(result).toEqual([]);
  });
});
