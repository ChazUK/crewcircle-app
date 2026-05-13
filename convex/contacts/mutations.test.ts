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

async function drain(t: TestConvex<typeof schema>) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

const aliceIdentity = {
  subject: "clerk_alice",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_alice",
};

const bobIdentity = {
  subject: "clerk_bob",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_bob",
};

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

describe("sendContactInvite", () => {
  test("creates pending invite + notification when inviting an existing user", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    expect(result.autoAccepted).toBe(false);
    const invites = await t.run((ctx) => ctx.db.query("contactInvites").collect());
    expect(invites).toHaveLength(1);
    expect(invites[0].status).toBe("pending");

    const notifications = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("byUserAndCreatedAt", (q) => q.eq("userId", bobId))
        .collect(),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].kind).toBe("contact_invite_received");
    await drain(t);
  });

  test("rejects self-invite by user id", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");

    await expect(
      t
        .withIdentity(aliceIdentity)
        .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: aliceId }),
    ).rejects.toThrow("self_invite");
  });

  test("rejects duplicate pending invite to same user", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    await expect(
      t
        .withIdentity(aliceIdentity)
        .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId }),
    ).rejects.toThrow("invite_exists");
    await drain(t);
  });

  test("auto-accepts when reciprocal pending invite exists", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    await t
      .withIdentity(bobIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: aliceId });

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    expect(result.autoAccepted).toBe(true);

    const contacts = await t.run((ctx) => ctx.db.query("contacts").collect());
    expect(contacts).toHaveLength(2);
    const owners = contacts.map((c) => c.ownerId).sort();
    expect(owners).toEqual([aliceId, bobId].sort());
    await drain(t);
  });

  test("rejects invite when already a contact", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    await t.run(async (ctx) => {
      await ctx.db.insert("contacts", {
        ownerId: aliceId,
        contactUserId: bobId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("contacts", {
        ownerId: bobId,
        contactUserId: aliceId,
        createdAt: Date.now(),
      });
    });

    await expect(
      t
        .withIdentity(aliceIdentity)
        .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId }),
    ).rejects.toThrow("already_contact");
  });

  test("invite by email matches an existing user via byEmail index", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { email: "bob@example.com" });

    expect(result.autoAccepted).toBe(false);
    const invites = await t.run((ctx) => ctx.db.query("contactInvites").collect());
    expect(invites[0].targetUserId).toBe(bobId);
    await drain(t);
  });

  test("invite by email persists external row when no matching user", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { email: "stranger@example.com" });

    const invites = await t.run((ctx) => ctx.db.query("contactInvites").collect());
    expect(invites).toHaveLength(1);
    expect(invites[0].targetUserId).toBeUndefined();
    expect(invites[0].targetEmail).toBe("stranger@example.com");

    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].name).toContain("sendContactInviteEmail");
    expect(scheduled[0].args[0]).toMatchObject({
      recipientEmail: "stranger@example.com",
      inviterEmail: "alice@example.com",
    });
    await drain(t);
  });
});

describe("acceptContactInvite", () => {
  test("creates contact rows for both directions and notifies inviter", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    await t
      .withIdentity(bobIdentity)
      .mutation(api.contacts.mutations.acceptContactInvite, { inviteId: result.inviteId });

    const contacts = await t.run((ctx) => ctx.db.query("contacts").collect());
    expect(contacts).toHaveLength(2);

    const aliceNotifs = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("byUserAndCreatedAt", (q) => q.eq("userId", aliceId))
        .collect(),
    );
    expect(aliceNotifs.some((n) => n.kind === "contact_invite_accepted")).toBe(true);
    await drain(t);
  });

  test("rejects when caller is not the invitee", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    await expect(
      t
        .withIdentity(aliceIdentity)
        .mutation(api.contacts.mutations.acceptContactInvite, { inviteId: result.inviteId }),
    ).rejects.toThrow("not_invitee");
    await drain(t);
  });
});

describe("removeContact", () => {
  test("removes both direction rows and cancels pending invite", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("contacts", { ownerId: aliceId, contactUserId: bobId, createdAt: now });
      await ctx.db.insert("contacts", { ownerId: bobId, contactUserId: aliceId, createdAt: now });
    });

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.removeContact, { contactUserId: bobId });

    const contacts = await t.run((ctx) => ctx.db.query("contacts").collect());
    expect(contacts).toHaveLength(0);
    await drain(t);
  });

  test("throws when not a contact", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    await expect(
      t
        .withIdentity(aliceIdentity)
        .mutation(api.contacts.mutations.removeContact, { contactUserId: bobId }),
    ).rejects.toThrow("not_contact");
  });
});

describe("declineContactInvite", () => {
  test("flips status to declined and notifies inviter", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    await t
      .withIdentity(bobIdentity)
      .mutation(api.contacts.mutations.declineContactInvite, { inviteId: result.inviteId });

    const invite = await t.run((ctx) => ctx.db.get(result.inviteId));
    expect(invite?.status).toBe("declined");

    const aliceNotifs = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("byUserAndCreatedAt", (q) => q.eq("userId", aliceId))
        .collect(),
    );
    expect(aliceNotifs.some((n) => n.kind === "contact_invite_declined")).toBe(true);
    await drain(t);
  });
});

describe("cancelContactInvite", () => {
  test("inviter cancels their own pending invite", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.cancelContactInvite, { inviteId: result.inviteId });

    const invite = await t.run((ctx) => ctx.db.get(result.inviteId));
    expect(invite?.status).toBe("canceled");
    await drain(t);
  });

  test("non-inviter cannot cancel", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    await expect(
      t
        .withIdentity(bobIdentity)
        .mutation(api.contacts.mutations.cancelContactInvite, { inviteId: result.inviteId }),
    ).rejects.toThrow("not_inviter");
    await drain(t);
  });
});
