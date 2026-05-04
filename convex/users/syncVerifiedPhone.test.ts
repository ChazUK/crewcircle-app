/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn().mockReturnValue({
    users: { getUser: mockGetUser },
  }),
}));

const modules = import.meta.glob("/convex/**/*.ts");

const identity = {
  subject: "user_clerk_sync_1",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|user_clerk_sync_1",
};

const baseClerkUser = {
  id: "user_clerk_sync_1",
  primaryPhoneNumberId: "phone_1",
  phoneNumbers: [
    { id: "phone_1", phoneNumber: "+447700900123", verification: { status: "verified" } },
  ],
  emailAddresses: [{ id: "email_1", emailAddress: "alice@example.com" }],
  primaryEmailAddressId: "email_1",
  firstName: "Alice",
  lastName: "Smith",
  imageUrl: "https://example.com/pic.jpg",
};

async function makeTestWithUser() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "alice@example.com",
      hasCompletedOnboarding: false,
    }),
  );
  return t;
}

describe("syncVerifiedPhone", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  test("verified primary phone: calls userUpdated and updates user document", async () => {
    mockGetUser.mockResolvedValue(baseClerkUser);
    const t = await makeTestWithUser();

    await t.withIdentity(identity).action(api.users.syncVerifiedPhone.syncVerifiedPhone, {});

    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.phone).toBe("+447700900123");
  });

  test("no verified primary phone: throws and leaves user document unchanged", async () => {
    mockGetUser.mockResolvedValue({
      ...baseClerkUser,
      phoneNumbers: [
        { id: "phone_1", phoneNumber: "+447700900123", verification: { status: "unverified" } },
      ],
    });
    const t = await makeTestWithUser();

    await expect(
      t.withIdentity(identity).action(api.users.syncVerifiedPhone.syncVerifiedPhone, {}),
    ).rejects.toThrow("No verified primary phone on Clerk user.");

    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.phone).toBeUndefined();
  });

  test("unauthenticated caller: throws and makes no Clerk request", async () => {
    const t = convexTest(schema, modules);

    await expect(t.action(api.users.syncVerifiedPhone.syncVerifiedPhone, {})).rejects.toThrow();

    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test("race: action and webhook both write same phone — result is idempotent", async () => {
    mockGetUser.mockResolvedValue(baseClerkUser);
    const t = await makeTestWithUser();

    await t.withIdentity(identity).action(api.users.syncVerifiedPhone.syncVerifiedPhone, {});
    await t.mutation(internal.users.webhooks.userUpdated, {
      externalAuthId: identity.subject,
      phone: "+447700900123",
    });

    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("byExternalAuthId", (q) => q.eq("externalAuthId", identity.subject))
        .unique(),
    );
    expect(user?.phone).toBe("+447700900123");
  });
});
