import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { fetchSortedCertifications } from "./fetchSortedCertifications";

const modules = import.meta.glob("../../**/*.ts");

const DAY_MS = 24 * 60 * 60 * 1000;

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

describe("fetchSortedCertifications", () => {
  test("sorts by expiry ascending with no-expiry last", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertCrewUser(t, "alice@example.com");

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", { userId, name: "No Expiry" });
      await ctx.db.insert("certifications", { userId, name: "Far Future", expiresAt: now + 365 * DAY_MS });
      await ctx.db.insert("certifications", { userId, name: "Soon", expiresAt: now + 30 * DAY_MS });
      await ctx.db.insert("certifications", { userId, name: "Expired", expiresAt: now - 10 * DAY_MS });
    });

    const result = await t.run((ctx) => fetchSortedCertifications(ctx, userId));

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe("Expired");
    expect(result[1].name).toBe("Soon");
    expect(result[2].name).toBe("Far Future");
    expect(result[3].name).toBe("No Expiry");
  });

  test("returns empty array when no certifications exist", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertCrewUser(t, "bob@example.com");

    const result = await t.run((ctx) => fetchSortedCertifications(ctx, userId));

    expect(result).toEqual([]);
  });

  test("maps fields correctly", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertCrewUser(t, "carol@example.com");

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", {
        userId,
        name: "First Aid",
        issuer: "Red Cross",
        referenceNumber: "FA-001",
        expiresAt: now + 90 * DAY_MS,
      });
    });

    const result = await t.run((ctx) => fetchSortedCertifications(ctx, userId));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "First Aid",
      issuer: "Red Cross",
      referenceNumber: "FA-001",
      expiresAt: now + 90 * DAY_MS,
    });
    expect(result[0].id).toBeDefined();
  });
});
