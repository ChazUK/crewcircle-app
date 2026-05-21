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

const mut = api.users.mutations.updateProfilePassports.updateProfilePassports;

describe("updateProfilePassports", () => {
  test("happy path: sets passports", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      passports: ["GB", "US", "IE"],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.passports).toEqual(["GB", "US", "IE"]);
  });

  test("rejects unknown country code", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        passports: ["GB", "XX"],
      }),
    ).rejects.toThrow('Unknown country code: "XX"');
  });

  test("rejects duplicate country code", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        passports: ["US", "US"],
      }),
    ).rejects.toThrow('Duplicate country code: "US"');
  });

  test("accepts empty array", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      passports: ["GB"],
    });
    await t.withIdentity(identity).mutation(mut, {
      passports: [],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.passports).toEqual([]);
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        passports: ["GB"],
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
