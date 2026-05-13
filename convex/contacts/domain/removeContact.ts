import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";
import { ConvexError } from "convex/values";

import { findContactPair } from "../db/findContactPair";
import { findPendingInviteBetween } from "../db/findPendingInviteBetween";

export const removeContact = async (
  ctx: MutationCtx,
  ownerId: Id<"users">,
  contactUserId: Id<"users">,
) => {
  if (ownerId === contactUserId) throw new ConvexError("invalid_target");

  const owned = await findContactPair(ctx, ownerId, contactUserId);
  const reverse = await findContactPair(ctx, contactUserId, ownerId);
  if (!owned && !reverse) throw new ConvexError("not_contact");

  if (owned) await ctx.db.delete(owned._id);
  if (reverse) await ctx.db.delete(reverse._id);

  const pending = await findPendingInviteBetween(ctx, ownerId, contactUserId);
  if (pending) {
    await ctx.db.patch(pending._id, { status: "canceled", respondedAt: Date.now() });
  }
};
