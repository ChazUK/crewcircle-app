/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { findOrCreateCatalogueEntry } from "./findOrCreateCatalogueEntry";

const modules = import.meta.glob("/convex/**/*.ts");

async function insertUser(
  t: TestConvex<typeof schema>,
  externalAuthId: string,
  email: string,
): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email,
      hasCompletedOnboarding: true,
      userType: "crew",
      isPublic: false,
    }),
  );
}

describe("findOrCreateCatalogueEntry", () => {
  test("inserts a new catalogue entry and returns its id", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) => findOrCreateCatalogueEntry(ctx, "Arri Alexa Mini"));

    const entry = await t.run((ctx) => ctx.db.get(id));
    expect(entry?.name).toBe("Arri Alexa Mini");
    expect(entry?.normalizedName).toBe("arri alexa mini");
  });

  test("returns the same id for duplicate normalised names", async () => {
    const t = convexTest(schema, modules);
    const id1 = await t.run((ctx) => findOrCreateCatalogueEntry(ctx, "Arri Alexa Mini"));
    const id2 = await t.run((ctx) => findOrCreateCatalogueEntry(ctx, "  arri alexa mini  "));

    expect(id1).toBe(id2);

    const all = await t.run((ctx) => ctx.db.query("kitCatalogue").collect());
    expect(all).toHaveLength(1);
  });

  test("creates separate entries for distinct normalised names", async () => {
    const t = convexTest(schema, modules);
    const id1 = await t.run((ctx) => findOrCreateCatalogueEntry(ctx, "Arri Alexa Mini"));
    const id2 = await t.run((ctx) => findOrCreateCatalogueEntry(ctx, "RED Komodo"));

    expect(id1).not.toBe(id2);
  });

  test("different users can link to the same catalogue entry via userKit", async () => {
    const t = convexTest(schema, modules);
    const alice = await insertUser(t, "clerk_alice", "alice@example.com");
    const bob = await insertUser(t, "clerk_bob", "bob@example.com");

    const catId = await t.run((ctx) => findOrCreateCatalogueEntry(ctx, "Arri Alexa Mini"));

    await t.run(async (ctx) => {
      await ctx.db.insert("userKit", { userId: alice, kitCatalogueId: catId });
      await ctx.db.insert("userKit", { userId: bob, kitCatalogueId: catId });
    });

    const aliceKit = await t.run((ctx) =>
      ctx.db
        .query("userKit")
        .withIndex("byUserId", (q) => q.eq("userId", alice))
        .collect(),
    );
    const bobKit = await t.run((ctx) =>
      ctx.db
        .query("userKit")
        .withIndex("byUserId", (q) => q.eq("userId", bob))
        .collect(),
    );

    expect(aliceKit).toHaveLength(1);
    expect(bobKit).toHaveLength(1);
    expect(aliceKit[0].kitCatalogueId).toBe(bobKit[0].kitCatalogueId);

    const catalogue = await t.run((ctx) => ctx.db.query("kitCatalogue").collect());
    expect(catalogue).toHaveLength(1);
  });
});
