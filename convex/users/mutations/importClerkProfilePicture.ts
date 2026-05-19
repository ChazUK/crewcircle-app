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

export const patchProfilePictureFileIdIfEmpty = internalMutation({
  args: { userId: v.id("users"), fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.profilePictureFileId) return false;
    await ctx.db.patch(args.userId, { profilePictureFileId: args.fileId });
    return true;
  },
});

export const importClerkProfilePicture = internalAction({
  args: {
    userId: v.id("users"),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing: string | null = await ctx.runQuery(
      internal.users.mutations.importClerkProfilePicture.getProfilePictureFileId,
      { userId: args.userId },
    );
    if (existing) return;

    const response = await fetch(args.imageUrl);
    if (!response.ok) return;

    const blob = await response.blob();
    const fileId = await ctx.storage.store(blob);

    const applied: boolean = await ctx.runMutation(
      internal.users.mutations.importClerkProfilePicture.patchProfilePictureFileIdIfEmpty,
      { userId: args.userId, fileId },
    );

    if (!applied) {
      await ctx.storage.delete(fileId);
    }
  },
});
