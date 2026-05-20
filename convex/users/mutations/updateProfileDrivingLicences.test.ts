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

const mut = api.users.mutations.updateProfileDrivingLicences.updateProfileDrivingLicences;

describe("updateProfileDrivingLicences", () => {
  test("happy path: sets driving licences", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      drivingLicences: ["Car (B)", "Motorcycle (A)", "Forklift"],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.drivingLicences).toEqual(["Car (B)", "Motorcycle (A)", "Forklift"]);
  });

  test("rejects unknown licence", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        drivingLicences: ["Car (B)", "Spaceship"],
      }),
    ).rejects.toThrow('Unknown driving licence: "Spaceship"');
  });

  test("rejects duplicate licence", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        drivingLicences: ["Forklift", "Forklift"],
      }),
    ).rejects.toThrow('Duplicate driving licence: "Forklift"');
  });

  test("accepts empty array", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      drivingLicences: ["Car (B)"],
    });
    await t.withIdentity(identity).mutation(mut, {
      drivingLicences: [],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.drivingLicences).toEqual([]);
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        drivingLicences: ["Car (B)"],
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
