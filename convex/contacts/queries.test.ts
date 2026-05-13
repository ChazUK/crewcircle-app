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
  firstName?: string,
): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email,
      hasCompletedOnboarding: true,
      isPublic: false,
      firstName: firstName ?? "Unknown",
      lastName: "Test",
    }),
  );
}

describe("listMyContacts", () => {
  test("returns only rows for the current user as owner", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com");
    const carolId = await insertUser(t, "clerk_carol", "carol@example.com");

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("contacts", { ownerId: aliceId, contactUserId: bobId, createdAt: now });
      await ctx.db.insert("contacts", {
        ownerId: bobId,
        contactUserId: carolId,
        createdAt: now,
      });
    });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.contacts.queries.listMyContacts, {});

    expect(result).toHaveLength(1);
    expect(result[0].user._id).toBe(bobId);
  });
});

describe("searchUsers", () => {
  test("excludes the current user", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com", "Alice");
    await insertUser(t, "clerk_bob", "bob@example.com", "Bob");

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.contacts.queries.searchUsers, { query: "ali" });

    expect(result.find((r) => r.user.email === "alice@example.com")).toBeUndefined();
  });

  test("marks existing contacts with state=contact", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await insertUser(t, "clerk_alice", "alice@example.com", "Alice");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com", "Bob");

    await t.run((ctx) =>
      ctx.db.insert("contacts", {
        ownerId: aliceId,
        contactUserId: bobId,
        createdAt: Date.now(),
      }),
    );

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.contacts.queries.searchUsers, { query: "bob" });

    expect(result).toHaveLength(1);
    expect(result[0].state).toBe("contact");
  });

  test("marks pending outgoing invite as state=pending", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com", "Alice");
    const bobId = await insertUser(t, "clerk_bob", "bob@example.com", "Bob");

    await t
      .withIdentity(aliceIdentity)
      .mutation(api.contacts.mutations.sendContactInvite, { targetUserId: bobId });

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.contacts.queries.searchUsers, { query: "bob" });

    expect(result[0].state).toBe("pending");
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });

  test("returns empty array for queries under 2 chars", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "clerk_alice", "alice@example.com");
    await insertUser(t, "clerk_bob", "bob@example.com");

    const result = await t
      .withIdentity(aliceIdentity)
      .query(api.contacts.queries.searchUsers, { query: "b" });

    expect(result).toEqual([]);
  });
});
