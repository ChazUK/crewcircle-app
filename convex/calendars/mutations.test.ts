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

describe("insertConnection label length validation", () => {
  test("rejects label longer than 256 characters via connectApple", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.connectApple, {
        label: "L".repeat(257),
        enabledSubCalendarIds: [],
        events: [],
      }),
    ).rejects.toThrow("Too big: expected string to have <=256 characters");
  });

  test("rejects label at 10 000 characters via connectApple", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.connectApple, {
        label: "L".repeat(10_000),
        enabledSubCalendarIds: [],
        events: [],
      }),
    ).rejects.toThrow("Too big: expected string to have <=256 characters");
  });

  test("accepts label at exactly 256 characters via connectApple", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).action(api.calendars.actions.connectApple, {
      label: "L".repeat(256),
      enabledSubCalendarIds: [],
      events: [],
    });
  });

  test("accepts a short label via connectApple", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).action(api.calendars.actions.connectApple, {
      label: "My Work Calendar",
      enabledSubCalendarIds: [],
      events: [],
    });
  });
});
