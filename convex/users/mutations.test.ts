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
