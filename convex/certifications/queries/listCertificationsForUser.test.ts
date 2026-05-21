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

const DAY_MS = 24 * 60 * 60 * 1000;

describe("listCertificationsForUser", () => {
  test("self returns rows sorted by expiry ascending, no-expiry last", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", {
        userId: aliceId,
        name: "No Expiry Cert",
      });
      await ctx.db.insert("certifications", {
        userId: aliceId,
        name: "Far Future Cert",
        expiresAt: now + 365 * DAY_MS,
      });
      await ctx.db.insert("certifications", {
        userId: aliceId,
        name: "Soon Cert",
        expiresAt: now + 30 * DAY_MS,
      });
      await ctx.db.insert("certifications", {
        userId: aliceId,
        name: "Expired Cert",
        expiresAt: now - 10 * DAY_MS,
      });
    });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.certifications.queries.listCertificationsForUser.listCertificationsForUser, {
        userId: aliceId,
      });

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe("Expired Cert");
    expect(result[1].name).toBe("Soon Cert");
    expect(result[2].name).toBe("Far Future Cert");
    expect(result[3].name).toBe("No Expiry Cert");
  });

  test("contact returns rows", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com");
    const bobId = await insertCrewUser(t, bobIdentity.subject, "bob@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", {
        userId: aliceId,
        name: "First Aid",
        issuer: "Red Cross",
      });
      await ctx.db.insert("contacts", {
        ownerId: bobId,
        contactUserId: aliceId,
        createdAt: Date.now(),
      });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.certifications.queries.listCertificationsForUser.listCertificationsForUser, {
        userId: aliceId,
      });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("First Aid");
    expect(result[0].issuer).toBe("Red Cross");
  });

  test("public-card returns empty array", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertCrewUser(t, aliceIdentity.subject, "alice@example.com", {
      isPublic: true,
    });
    await insertCrewUser(t, bobIdentity.subject, "bob@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", { userId: aliceId, name: "CSCS" });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.certifications.queries.listCertificationsForUser.listCertificationsForUser, {
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
      await ctx.db.insert("certifications", { userId: aliceId, name: "CSCS" });
    });

    const result = await t
      .withIdentity(bobIdentity)
      .query(api.certifications.queries.listCertificationsForUser.listCertificationsForUser, {
        userId: aliceId,
      });

    expect(result).toEqual([]);
  });
});
