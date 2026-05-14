/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const identity = {
  subject: "clerk_user_42",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_42",
};

async function makeTestWithUser() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "me@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
      phone: "+447700000000",
    }),
  );
  return t;
}

async function makeTestUserWithPhone(phone: string | undefined) {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "me@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
      ...(phone !== undefined && { phone }),
    }),
  );
  return t;
}

describe("completeOnboarding string length validation", () => {
  test("rejects firstName longer than 100 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
        firstName: "A".repeat(101),
        lastName: "Smith",
        userType: "crew",
      }),
    ).rejects.toThrow("Too big: expected string to have <=100 characters");
  });

  test("rejects lastName longer than 100 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
        firstName: "Alice",
        lastName: "B".repeat(101),
        userType: "crew",
      }),
    ).rejects.toThrow("Too big: expected string to have <=100 characters");
  });

  test("accepts firstName and lastName at exactly 100 characters", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "A".repeat(100),
      lastName: "B".repeat(100),
      userType: "crew",
    });
  });

  test("accepts firstName and lastName within limits", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "Alice",
      lastName: "Smith",
      userType: "crew",
    });
  });
});

describe("completeOnboarding phone", () => {
  test("succeeds when user has no phone set", async () => {
    const t = await makeTestUserWithPhone(undefined);
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "Alice",
      lastName: "Smith",
      userType: "crew",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.hasCompletedOnboarding).toBe(true);
  });

  test("succeeds when user phone is empty string", async () => {
    const t = await makeTestUserWithPhone("");
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "Alice",
      lastName: "Smith",
      userType: "crew",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.hasCompletedOnboarding).toBe(true);
  });

  test("succeeds when user has a phone set", async () => {
    const t = await makeTestUserWithPhone("+447700000000");
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "Alice",
      lastName: "Smith",
      userType: "crew",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.hasCompletedOnboarding).toBe(true);
  });
});

describe("completeOnboarding department and roles", () => {
  test("persists department and roles for crew", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "Alice",
      lastName: "Smith",
      userType: "crew",
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

  test("rejects a role that does not belong to the chosen department", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
        firstName: "Alice",
        lastName: "Smith",
        userType: "crew",
        department: "Camera",
        roles: ["Gaffer"],
      }),
    ).rejects.toThrow('Role "Gaffer" does not belong to department "Camera"');
  });

  test("rejects roles when department is not provided", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
        firstName: "Alice",
        lastName: "Smith",
        userType: "crew",
        roles: ["Director of Photography"],
      }),
    ).rejects.toThrow("Department is required when roles are provided");
  });

  test("omits department and roles when not provided", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
      firstName: "Alice",
      lastName: "Smith",
      userType: "production-manager",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.department).toBeUndefined();
    expect(user?.roles).toBeUndefined();
  });
});

describe("updateProfile bio length validation", () => {
  test("rejects bio longer than 1000 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        bio: "B".repeat(10_000),
      }),
    ).rejects.toThrow("Too big: expected string to have <=1000 characters");
  });

  test("rejects bio at 1001 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        bio: "B".repeat(1001),
      }),
    ).rejects.toThrow("Too big: expected string to have <=1000 characters");
  });

  test("accepts bio at exactly 1000 characters", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
      bio: "B".repeat(1000),
    });
  });

  test("accepts a short bio", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
      bio: "Experienced focus puller based in London.",
    });
  });

  test("accepts undefined bio (no-op)", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {});
  });
});

describe("updateProfileIdentity", () => {
  test("sets nickname on crew user", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfileIdentity, {
      nickname: "Joey",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.nickname).toBe("Joey");
  });

  test("rejects nickname longer than 50 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfileIdentity, {
        nickname: "A".repeat(51),
      }),
    ).rejects.toThrow();
  });

  test("trims whitespace from nickname", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfileIdentity, {
      nickname: "  Joey  ",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.nickname).toBe("Joey");
  });

  test("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.users.mutations.updateProfileIdentity, { nickname: "Joey" }),
    ).rejects.toThrow("Not authenticated");
  });

  test("does not mutate other fields", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: false,
        firstName: "Existing",
      }),
    );
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfileIdentity, {
      nickname: "Joey",
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.firstName).toBe("Existing");
  });

  test("omitting nickname preserves the stored value", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: false,
        nickname: "Joey",
      }),
    );
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfileIdentity, {});
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.nickname).toBe("Joey");
  });
});

describe("updateProfile URL validation", () => {
  test("rejects javascript: protocol as website", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        website: "javascript:alert(1)",
      }),
    ).rejects.toThrow("Invalid URL");
  });

  test("rejects plain string without protocol as website", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        website: "not-a-url",
      }),
    ).rejects.toThrow("Invalid URL");
  });

  test("rejects javascript: protocol as imdbUrl", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        imdbUrl: "javascript:void(0)",
      }),
    ).rejects.toThrow("Invalid URL");
  });

  test("rejects plain string without protocol as cvUrl", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        cvUrl: "my-cv",
      }),
    ).rejects.toThrow("Invalid URL");
  });

  test("accepts valid https:// URL", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
      website: "https://example.com",
      imdbUrl: "https://www.imdb.com/name/nm0000001",
      cvUrl: "https://docs.example.com/my-cv.pdf",
    });
  });

  test("accepts valid http:// URL", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
      website: "http://example.com",
    });
  });

  test("accepts undefined fields (no-op)", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {});
  });
});
