/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const aliceIdentity = {
  subject: "clerk_alice",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_alice",
};

async function insertUser(
  t: TestConvex<typeof schema>,
  externalAuthId: string,
  email: string,
): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email,
      hasCompletedOnboarding: true,
      isPublic: false,
    }),
  );
}

async function insertNotification(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
): Promise<Id<"notifications">> {
  return t.run(async (ctx) => {
    const inviteId = await ctx.db.insert("contactInvites", {
      fromUserId: userId,
      target: { kind: "user", userId },
      targetUserId: userId,
      status: "pending",
      createdAt: Date.now(),
    });
    return ctx.db.insert("notifications", {
      userId,
      kind: "contact_invite_received",
      payload: { inviteId },
      createdAt: Date.now(),
    });
  });
}

describe("markNotificationRead", () => {
  test("marks own notification as read", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const notifId = await insertNotification(t, aliceId);

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.notifications.mutations.markNotificationRead, { notificationId: notifId });

    const notif = await t.run((ctx) => ctx.db.get(notifId));
    expect(notif?.readAt).toBeGreaterThan(0);
  });

  test("rejects when not the owner", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");
    const notifId = await insertNotification(t, bobId);

    await expect(
      t
        .withIdentity(aliceIdentity)
        .mutation(api.notifications.mutations.markNotificationRead, { notificationId: notifId }),
    ).rejects.toThrow("not_owner");
  });
});

describe("markAllNotificationsRead", () => {
  test("marks every unread notification as read", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    await insertNotification(t, aliceId);
    await insertNotification(t, aliceId);

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.notifications.mutations.markAllNotificationsRead, {});

    const notifs = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("byUserAndCreatedAt", (q) => q.eq("userId", aliceId))
        .collect(),
    );
    expect(notifs.every((n) => n.readAt !== undefined)).toBe(true);
  });
});
