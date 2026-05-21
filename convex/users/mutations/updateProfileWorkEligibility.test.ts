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

const mut = api.users.mutations.updateProfileWorkEligibility.updateProfileWorkEligibility;

describe("updateProfileWorkEligibility", () => {
  test("happy path: sets work eligibility regions", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      workEligibility: ["Right to Work UK", "Schengen", "USA"],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.workEligibility).toEqual(["Right to Work UK", "Schengen", "USA"]);
  });

  test("rejects unknown region", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        workEligibility: ["Right to Work UK", "Mars"],
      }),
    ).rejects.toThrow('Unknown work eligibility region: "Mars"');
  });

  test("rejects duplicate region", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        workEligibility: ["USA", "USA"],
      }),
    ).rejects.toThrow('Duplicate work eligibility region: "USA"');
  });

  test("accepts empty array", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      workEligibility: ["Canada"],
    });
    await t.withIdentity(identity).mutation(mut, {
      workEligibility: [],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.workEligibility).toEqual([]);
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        workEligibility: ["Right to Work UK"],
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
