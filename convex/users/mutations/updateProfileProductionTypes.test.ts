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

const mut = api.users.mutations.updateProfileProductionTypes.updateProfileProductionTypes;

describe("updateProfileProductionTypes", () => {
  test("happy path: sets production types", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      productionTypes: ["Feature Film", "Documentary", "Commercial"],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.productionTypes).toEqual(["Feature Film", "Documentary", "Commercial"]);
  });

  test("rejects unknown production type", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        productionTypes: ["Feature Film", "Podcast"],
      }),
    ).rejects.toThrow('Unknown production type: "Podcast"');
  });

  test("rejects duplicate production type", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        productionTypes: ["Documentary", "Documentary"],
      }),
    ).rejects.toThrow('Duplicate production type: "Documentary"');
  });

  test("accepts empty array", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      productionTypes: ["Feature Film"],
    });
    await t.withIdentity(identity).mutation(mut, {
      productionTypes: [],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.productionTypes).toEqual([]);
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        productionTypes: ["Feature Film"],
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
