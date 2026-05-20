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

const mut = api.users.mutations.updateProfileVisibility.updateProfileVisibility;

describe("updateProfileVisibility", () => {
  test("happy path: sets isPublic to true", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, { isPublic: true });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.isPublic).toBe(true);
  });

  test("happy path: flips isPublic from true to false", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, { isPublic: true });
    await t.withIdentity(identity).mutation(mut, { isPublic: false });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.isPublic).toBe(false);
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(mut, { isPublic: true })).rejects.toThrow("Not authenticated");
  });
});
