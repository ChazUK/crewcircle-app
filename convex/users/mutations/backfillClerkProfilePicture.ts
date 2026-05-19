import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../../_generated/server";

export const getProfilePictureFileId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.profilePictureFileId ?? null;
  },
});

export const patchProfilePictureFileId = internalMutation({
  args: { userId: v.id("users"), fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { profilePictureFileId: args.fileId });
  },
});

export const backfillClerkProfilePicture = internalAction({
  args: {
    userId: v.id("users"),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing: string | null = await ctx.runQuery(
      internal.users.mutations.backfillClerkProfilePicture.getProfilePictureFileId,
      { userId: args.userId },
    );
    if (existing) return;

    const response = await fetch(args.imageUrl);
    if (!response.ok) return;

    const blob = await response.blob();
    const fileId = await ctx.storage.store(blob);

    await ctx.runMutation(
      internal.users.mutations.backfillClerkProfilePicture.patchProfilePictureFileId,
      { userId: args.userId, fileId },
    );
  },
});
