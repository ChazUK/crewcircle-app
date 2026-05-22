/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const identity = {
  subject: "clerk_user_42",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_42",
};

async function makeTestWithPmUser() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "pm@example.com",
      hasCompletedOnboarding: true,
      userType: "production-manager",
    }),
  );
  return t;
}

async function makeTestWithCrewUser() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "crew@example.com",
      hasCompletedOnboarding: true,
      userType: "crew",
    }),
  );
  return t;
}

const mut = api.users.mutations.updateProductionCompany.updateProductionCompany;

describe("updateProductionCompany", () => {
  test("happy path: sets production company", async () => {
    const t = await makeTestWithPmUser();
    await t.withIdentity(identity).mutation(mut, {
      productionCompany: "Acme Films",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.productionCompany).toBe("Acme Films");
  });

  test("trims whitespace", async () => {
    const t = await makeTestWithPmUser();
    await t.withIdentity(identity).mutation(mut, {
      productionCompany: "  Acme Films  ",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.productionCompany).toBe("Acme Films");
  });

  test("clears field when given empty string", async () => {
    const t = await makeTestWithPmUser();
    await t.withIdentity(identity).mutation(mut, {
      productionCompany: "Acme Films",
    });
    await t.withIdentity(identity).mutation(mut, {
      productionCompany: "",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.productionCompany).toBeUndefined();
  });

  test("rejects value longer than 100 characters", async () => {
    const t = await makeTestWithPmUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        productionCompany: "x".repeat(101),
      }),
    ).rejects.toThrow("Production company must be 100 characters or fewer");
  });

  test("rejects when caller is crew", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        productionCompany: "Acme Films",
      }),
    ).rejects.toThrow("Only production manager accounts can update production company");
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(mut, { productionCompany: "Acme Films" })).rejects.toThrow(
      "Not authenticated",
    );
  });

  test("does not affect other fields", async () => {
    const t = await makeTestWithPmUser();
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique();
      await ctx.db.patch(user!._id, { bio: "Test bio" });
    });
    await t.withIdentity(identity).mutation(mut, {
      productionCompany: "Acme Films",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.bio).toBe("Test bio");
    expect(user?.productionCompany).toBe("Acme Films");
  });
});
