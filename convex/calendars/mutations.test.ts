/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Must run before static imports so the module-level IIFE in crypto.ts finds the key.
vi.hoisted(() => {
  process.env.CALENDAR_ENCRYPTION_KEY = Buffer.alloc(32, 0).toString("base64");
});

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const TEST_KEY = Buffer.alloc(32, 0).toString("base64");

beforeEach(() => {
  vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

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
  test("rejects label longer than 256 characters via connectNative", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.connectNative, {
        label: "L".repeat(257),
        enabledSubCalendarIds: [],
        events: [],
      }),
    ).rejects.toThrow("Too big: expected string to have <=256 characters");
  });

  test("rejects label at 10 000 characters via connectNative", async () => {
    const t = await makeTestWithUser();
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.connectNative, {
        label: "L".repeat(10_000),
        enabledSubCalendarIds: [],
        events: [],
      }),
    ).rejects.toThrow("Too big: expected string to have <=256 characters");
  });

  test("accepts label at exactly 256 characters via connectNative", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).action(api.calendars.actions.connectNative, {
      label: "L".repeat(256),
      enabledSubCalendarIds: [],
      events: [],
    });
  });

  test("accepts a short label via connectNative", async () => {
    const t = await makeTestWithUser();
    await t.withIdentity(identity).action(api.calendars.actions.connectNative, {
      label: "My Work Calendar",
      enabledSubCalendarIds: [],
      events: [],
    });
  });
});
