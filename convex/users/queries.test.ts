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

const identity2 = {
  subject: "clerk_user_99",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_99",
};

describe("getCurrentUser", () => {
  test("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.users.queries.getCurrentUser, {});
    expect(result).toBeNull();
  });

  test("returns null when the identity has no matching user row", async () => {
    const t = convexTest(schema, modules);
    const result = await t.withIdentity(identity).query(api.users.queries.getCurrentUser, {});
    expect(result).toBeNull();
  });

  test("returns the user row matching the identity subject", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );
    const result = await t.withIdentity(identity).query(api.users.queries.getCurrentUser, {});
    expect(result?.email).toBe("me@example.com");
  });
});

describe("getMyProfile", () => {
  test("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.users.queries.getMyProfile, {});
    expect(result).toBeNull();
  });

  test("returns null when authenticated but no matching users row", async () => {
    const t = convexTest(schema, modules);
    const result = await t.withIdentity(identity).query(api.users.queries.getMyProfile, {});
    expect(result).toBeNull();
  });

  test("returns null when user row exists but userType is undefined", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: false,
      }),
    );
    const result = await t.withIdentity(identity).query(api.users.queries.getMyProfile, {});
    expect(result).toBeNull();
  });

  test("returns self variant with all identity fields for crew user", async () => {
    const t = convexTest(schema, modules);
    const fileId = await t.run((ctx) =>
      ctx.storage.store(new Blob([new Uint8Array(64)], { type: "image/jpeg" })),
    );
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
        firstName: "Alice",
        lastName: "Smith",
        nickname: "Ali",
        profilePictureFileId: fileId,
      }),
    );
    const result = await t.withIdentity(identity).query(api.users.queries.getMyProfile, {});
    expect(result).not.toBeNull();
    expect(result?.mode).toBe("self");
    expect(result?.userType).toBe("crew");
    expect(result?.firstName).toBe("Alice");
    expect(result?.lastName).toBe("Smith");
    expect(result?.nickname).toBe("Ali");
    expect(result?.profilePictureUrl).toBeDefined();
    expect(result?.profilePictureUrl).toContain("https://");
  });

  test("returns pm-self variant for production-manager user", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "pm@example.com",
        hasCompletedOnboarding: true,
        userType: "production-manager",
        firstName: "Bob",
        lastName: "Jones",
      }),
    );
    const result = await t.withIdentity(identity).query(api.users.queries.getMyProfile, {});
    expect(result?.mode).toBe("pm-self");
    expect(result?.userType).toBe("production-manager");
  });
});

describe("getProfile", () => {
  test("returns self variant when viewing own user id as crew", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "me@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
        firstName: "Alice",
        lastName: "Smith",
      }),
    );
    const result = await t.withIdentity(identity).query(api.users.queries.getProfile, { userId });
    expect(result?.mode).toBe("self");
    expect(result?.userType).toBe("crew");
  });

  test("returns contact variant when viewing a crew user who is in my contacts", async () => {
    const t = convexTest(schema, modules);
    const viewerId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "viewer@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
      }),
    );
    const subjectId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity2.subject,
        email: "subject@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
        isPublic: false,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("contacts", {
        ownerId: viewerId,
        contactUserId: subjectId,
        createdAt: Date.now(),
      }),
    );
    const result = await t
      .withIdentity(identity)
      .query(api.users.queries.getProfile, { userId: subjectId });
    expect(result?.mode).toBe("contact");
  });

  test("returns public-card variant for crew with isPublic:true and not in contacts", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "viewer@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
      }),
    );
    const subjectId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity2.subject,
        email: "public@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
        isPublic: true,
      }),
    );
    const result = await t
      .withIdentity(identity)
      .query(api.users.queries.getProfile, { userId: subjectId });
    expect(result?.mode).toBe("public-card");
  });

  test("returns null for crew with isPublic:false and not in contacts", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "viewer@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
      }),
    );
    const subjectId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity2.subject,
        email: "private@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
        isPublic: false,
      }),
    );
    const result = await t
      .withIdentity(identity)
      .query(api.users.queries.getProfile, { userId: subjectId });
    expect(result).toBeNull();
  });

  test("returns null when viewing a production-manager other than self", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "viewer@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
      }),
    );
    const pmId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity2.subject,
        email: "pm@example.com",
        hasCompletedOnboarding: true,
        userType: "production-manager",
      }),
    );
    const result = await t
      .withIdentity(identity)
      .query(api.users.queries.getProfile, { userId: pmId });
    expect(result).toBeNull();
  });

  test("returns null when viewing a non-existent user id", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: identity.subject,
        email: "viewer@example.com",
        hasCompletedOnboarding: true,
        userType: "crew",
      }),
    );
    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        externalAuthId: "temp",
        email: "temp@example.com",
        hasCompletedOnboarding: false,
      });
      await ctx.db.delete(id);
      return id;
    });
    const result = await t
      .withIdentity(identity)
      .query(api.users.queries.getProfile, { userId: fakeId });
    expect(result).toBeNull();
  });
});
