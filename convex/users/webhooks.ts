import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { convertExternalInvitesForNewUser } from "../contacts/domain/convertExternalInvitesForNewUser";
import { getUserByExternalId } from "./db/getUser";
import { createUser, deleteUser, updateUser } from "./domain/syncUser";

export const userCreated = internalMutation({
  args: {
    externalAuthId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profilePictureUrl, ...createArgs } = args;

    const userId = await createUser(ctx, createArgs);

    if (profilePictureUrl) {
      await ctx.scheduler.runAfter(
        0,
        internal.users.mutations.backfillClerkProfilePicture.backfillClerkProfilePicture,
        { userId, imageUrl: profilePictureUrl },
      );
    }

    const created = await getUserByExternalId(ctx, args.externalAuthId);
    if (created) {
      await convertExternalInvitesForNewUser(ctx, {
        userId: created._id,
        email: args.email,
        ...(args.phone ? { phone: args.phone } : {}),
      });
    }
    return userId;
  },
});

export const userUpdated = internalMutation({
  args: {
    externalAuthId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: (ctx, args) => updateUser(ctx, args),
});

export const userDeleted = internalMutation({
  args: { externalAuthId: v.string() },
  handler: (ctx, args) => deleteUser(ctx, args),
});
