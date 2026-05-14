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

const mut = api.users.mutations.updateDepartmentAndRoles.updateDepartmentAndRoles;

describe("updateDepartmentAndRoles", () => {
  test("happy path: sets department and roles", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      department: "Camera",
      roles: ["Director of Photography", "Camera Operator"],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.department).toBe("Camera");
    expect(user?.roles).toEqual(["Director of Photography", "Camera Operator"]);
  });

  test("rejects empty roles array", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        department: "Camera",
        roles: [],
      }),
    ).rejects.toThrow("At least one role must be selected");
  });

  test("rejects a role that does not belong to the chosen department", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        department: "Camera",
        roles: ["Key Grip"],
      }),
    ).rejects.toThrow('Role "Key Grip" does not belong to department "Camera"');
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        department: "Sound",
        roles: ["Boom Operator"],
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
        nickname: "Ali",
      }),
    );
    await t.withIdentity(identity).mutation(mut, {
      department: "Grip",
      roles: ["Key Grip"],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.firstName).toBe("Alice");
    expect(user?.nickname).toBe("Ali");
  });
});
