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

const mut = api.users.mutations.updateProfileLanguages.updateProfileLanguages;

describe("updateProfileLanguages", () => {
  test("happy path: sets spoken languages", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      spokenLanguages: [
        { code: "en", fluency: "native" },
        { code: "fr", fluency: "fluent" },
        { code: "de", fluency: "basic" },
      ],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.spokenLanguages).toEqual([
      { code: "en", fluency: "native" },
      { code: "fr", fluency: "fluent" },
      { code: "de", fluency: "basic" },
    ]);
  });

  test("rejects unknown language code", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        spokenLanguages: [{ code: "xx", fluency: "native" }],
      }),
    ).rejects.toThrow('Unknown language code: "xx"');
  });

  test("rejects unknown fluency level", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        spokenLanguages: [{ code: "en", fluency: "expert" }],
      }),
    ).rejects.toThrow('Unknown fluency level: "expert"');
  });

  test("rejects duplicate language code", async () => {
    const t = await makeTestWithCrewUser();
    await expect(
      t.withIdentity(identity).mutation(mut, {
        spokenLanguages: [
          { code: "en", fluency: "native" },
          { code: "en", fluency: "fluent" },
        ],
      }),
    ).rejects.toThrow('Duplicate language code: "en"');
  });

  test("accepts empty array", async () => {
    const t = await makeTestWithCrewUser();
    await t.withIdentity(identity).mutation(mut, {
      spokenLanguages: [{ code: "en", fluency: "native" }],
    });
    await t.withIdentity(identity).mutation(mut, {
      spokenLanguages: [],
    });
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.spokenLanguages).toEqual([]);
  });

  test("rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(mut, {
        spokenLanguages: [{ code: "en", fluency: "native" }],
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
