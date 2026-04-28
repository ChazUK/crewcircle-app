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
