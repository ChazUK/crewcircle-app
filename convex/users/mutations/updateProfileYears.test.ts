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

const mut = api.users.mutations.updateProfileYears.updateProfileYears;

describe("updateProfileYears", () => {
  test("happy path: sets startYearInDepartment", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      startYearInDepartment: 2018,
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.startYearInDepartment).toBe(2018);
  });

  test("rejects year before 1900", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        startYearInDepartment: 1899,
      }),
    ).rejects.toThrow("Year must be 1900 or later");
  });

  test("rejects future year", async () => {
    const t = await makeTestWithCrewUser();
    const futureYear = new Date().getFullYear() + 1;
    await expect(
      t.withIdentity(identity).mutation(mut, {
        startYearInDepartment: futureYear,
      }),
    ).rejects.toThrow("Year cannot be in the future");
  });

  test("rejects non-integer", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        startYearInDepartment: 2018.5,
      }),
    ).rejects.toThrow("Year must be a whole number");
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        startYearInDepartment: 2020,
      }),
    ).rejects.toThrow("Not authenticated");
  });

  test("does not touch other fields", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
        firstName: "Alice",
        department: "Camera",
      }),
    );
    await t.withIdentity(identity).mutation(mut, {
      startYearInDepartment: 2015,
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.firstName).toBe("Alice");
    expect(user?.department).toBe("Camera");
  });
});
