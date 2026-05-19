/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("/convex/**/*.ts");

describe("backfillClerkProfilePicture", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob([new Uint8Array(64)], { type: "image/jpeg" }), {
          status: 200,
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("downloads and stores the image when user has no profilePictureFileId", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "ext_1",
        email: "test@example.com",
        hasCompletedOnboarding: false,
      }),
    );

    await t.action(
      internal.users.mutations.backfillClerkProfilePicture.backfillClerkProfilePicture,
      { userId, imageUrl: "https://img.clerk.com/fake.jpg" },
    );

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.profilePictureFileId).toBeDefined();
    expect(fetch).toHaveBeenCalledWith("https://img.clerk.com/fake.jpg");
  });

  test("skips when user already has a profilePictureFileId", async () => {
    const t = convexTest(schema, modules);
    const existingFileId = await t.run((ctx) =>
      ctx.storage.store(new Blob([new Uint8Array(32)], { type: "image/png" })),
    );
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "ext_2",
        email: "existing@example.com",
        hasCompletedOnboarding: false,
        profilePictureFileId: existingFileId,
      }),
    );

    await t.action(
      internal.users.mutations.backfillClerkProfilePicture.backfillClerkProfilePicture,
      { userId, imageUrl: "https://img.clerk.com/ignored.jpg" },
    );

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.profilePictureFileId).toBe(existingFileId);
    expect(fetch).not.toHaveBeenCalled();
  });
});
