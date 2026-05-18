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

async function makeTestWithCrewUser() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "me@example.com",
      hasCompletedOnboarding: true,
      userType: "crew",
    }),
  );
  return t;
}

const mut = api.users.mutations.updateProfileLocation.updateProfileLocation;

describe("updateProfileLocation", () => {
  test("happy path: sets city and country", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      city: "London",
      country: "GB",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.city).toBe("London");
    expect(user?.country).toBe("GB");
  });

  test("rejects city longer than 100 characters", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        city: "x".repeat(101),
      }),
    ).rejects.toThrow("City must be 100 characters or fewer");
  });

  test("rejects unknown country code", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        country: "ZZ",
      }),
    ).rejects.toThrow("Unknown country code");
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(mut, { city: "London" })).rejects.toThrow("Not authenticated");
  });

  test("clears fields when given empty strings", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      city: "London",
      country: "GB",
    });
    await t.withIdentity(identity).mutation(mut, {
      city: "",
      country: "",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.city).toBeUndefined();
    expect(user?.country).toBeUndefined();
  });

  test("does not affect other fields", async () => {
    const t = await makeTestWithCrewUser();
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique();
      await ctx.db.patch(user!._id, { bio: "Test bio" });
    });
    await t.withIdentity(identity).mutation(mut, {
      city: "London",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.bio).toBe("Test bio");
    expect(user?.city).toBe("London");
  });
});
