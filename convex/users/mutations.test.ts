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
      hasCompletedOnboarding: true,
      isPublic: false,
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
    ).rejects.toThrow("firstName exceeds maximum length of 100 characters");
  });

  test("rejects lastName longer than 100 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.completeOnboarding, {
        firstName: "Alice",
        lastName: "B".repeat(101),
        userType: "crew",
      }),
    ).rejects.toThrow("lastName exceeds maximum length of 100 characters");
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

describe("updateProfile bio length validation", () => {
  test("rejects bio longer than 1000 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        bio: "B".repeat(10_000),
      }),
    ).rejects.toThrow("bio exceeds maximum length of 1000 characters");
  });

  test("rejects bio at 1001 characters", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        bio: "B".repeat(1001),
      }),
    ).rejects.toThrow("bio exceeds maximum length of 1000 characters");
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

describe("updateProfile URL validation", () => {
  test("rejects javascript: protocol as website", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        website: "javascript:alert(1)",
      }),
    ).rejects.toThrow("must use http or https");
  });

  test("rejects plain string without protocol as website", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        website: "not-a-url",
      }),
    ).rejects.toThrow("not a valid URL");
  });

  test("rejects javascript: protocol as imdbUrl", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        imdbUrl: "javascript:void(0)",
      }),
    ).rejects.toThrow("must use http or https");
  });

  test("rejects plain string without protocol as cvUrl", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).mutation(api.users.mutations.updateProfile, {
        cvUrl: "my-cv",
      }),
    ).rejects.toThrow("not a valid URL");
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
