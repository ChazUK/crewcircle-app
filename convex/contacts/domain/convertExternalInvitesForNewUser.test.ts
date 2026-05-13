/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { convertExternalInvitesForNewUser } from "./convertExternalInvitesForNewUser";

const modules = import.meta.glob("/convex/**/*.ts");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function insertUser(
  t: TestConvex<typeof schema>,
  externalAuthId: string,
  email: string,
  phone?: string,
): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email,
      hasCompletedOnboarding: true,
      isPublic: false,
      ...(phone ? { phone } : {}),
    }),
  );
}

describe("convertExternalInvitesForNewUser", () => {
  test("upgrades pending email invites case-insensitively", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const newBobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const inviteId = await t.run((ctx) =>
      ctx.db.insert("contactInvites", {
        fromUserId: aliceId,
        target: { kind: "email", email: "bob@example.com" },
        targetEmail: "bob@example.com",
        status: "pending",
        createdAt: Date.now(),
      }),
    );

    await t.run((ctx) =>
      convertExternalInvitesForNewUser(ctx, { userId: newBobId, email: "BOB@example.com" }),
    );

    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    expect(invite?.targetUserId).toBe(newBobId);
    expect(invite?.convertedFromTarget).toBe("email");

    const notifications = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("byUserAndCreatedAt", (q) => q.eq("userId", newBobId))
        .collect(),
    );
    expect(notifications.some((n) => n.kind === "contact_invite_received")).toBe(true);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });

  test("upgrades phone invites when phone supplied", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const newBobId = await insertUser(t, "clerk_bob", "bob@example.com", "+447700000000");

    const inviteId = await t.run((ctx) =>
      ctx.db.insert("contactInvites", {
        fromUserId: aliceId,
        target: { kind: "phone", phone: "+447700000000" },
        targetPhone: "+447700000000",
        status: "pending",
        createdAt: Date.now(),
      }),
    );

    await t.run((ctx) =>
      convertExternalInvitesForNewUser(ctx, {
        userId: newBobId,
        email: "bob@example.com",
        phone: "+447700000000",
      }),
    );

    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    expect(invite?.targetUserId).toBe(newBobId);
    expect(invite?.convertedFromTarget).toBe("phone");
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });

  test("leaves non-pending invites untouched", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const newBobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const inviteId = await t.run((ctx) =>
      ctx.db.insert("contactInvites", {
        fromUserId: aliceId,
        target: { kind: "email", email: "bob@example.com" },
        targetEmail: "bob@example.com",
        status: "declined",
        createdAt: Date.now(),
      }),
    );

    await t.run((ctx) =>
      convertExternalInvitesForNewUser(ctx, { userId: newBobId, email: "bob@example.com" }),
    );

    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    expect(invite?.status).toBe("declined");
    expect(invite?.targetUserId).toBeUndefined();
  });

  test("does not match by phone when phone arg is missing", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const newBobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const inviteId = await t.run((ctx) =>
      ctx.db.insert("contactInvites", {
        fromUserId: aliceId,
        target: { kind: "phone", phone: "+447700000000" },
        targetPhone: "+447700000000",
        status: "pending",
        createdAt: Date.now(),
      }),
    );

    await t.run((ctx) =>
      convertExternalInvitesForNewUser(ctx, { userId: newBobId, email: "bob@example.com" }),
    );

    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    expect(invite?.targetUserId).toBeUndefined();
  });
});
