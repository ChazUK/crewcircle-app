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

describe("myUnreadCount", () => {
  test("returns 0 when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.notifications.queries.myUnreadCount, {});
    expect(result).toBe(0);
  });

  test("counts only unread notifications for the current user", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const now = Date.now();
    await t.run(async (ctx) => {
      const inviteId = await ctx.db.insert("contactInvites", {
        fromUserId: aliceId,
        target: { kind: "user", userId: aliceId },
        targetUserId: aliceId,
        status: "pending",
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        userId: aliceId,
        kind: "contact_invite_received",
        payload: { inviteId },
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        userId: aliceId,
        kind: "contact_invite_received",
        payload: { inviteId },
        createdAt: now,
        readAt: now,
      });
    });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.notifications.queries.myUnreadCount, {});
    expect(result).toBe(1);
  });

  test("caps at 100 so the index scan stays bounded", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const now = Date.now();
    await t.run(async (ctx) => {
      const inviteId = await ctx.db.insert("contactInvites", {
        fromUserId: aliceId,
        target: { kind: "user", userId: aliceId },
        targetUserId: aliceId,
        status: "pending",
        createdAt: now,
      });
      for (let i = 0; i < 150; i++) {
        await ctx.db.insert("notifications", {
          userId: aliceId,
          kind: "contact_invite_received",
          payload: { inviteId },
          createdAt: now + i,
        });
      }
    });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.notifications.queries.myUnreadCount, {});
    expect(result).toBe(100);
  });
});

describe("myUnreadIncomingInviteCount", () => {
  test("counts pending incoming invites for the current user", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    await t.run((ctx) =>
      ctx.db.insert("contactInvites", {
        fromUserId: bobId,
        target: { kind: "user", userId: aliceId },
        targetUserId: aliceId,
        status: "pending",
        createdAt: Date.now(),
      }),
    );

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.notifications.queries.myUnreadIncomingInviteCount, {});
    expect(result).toBe(1);
  });
});
