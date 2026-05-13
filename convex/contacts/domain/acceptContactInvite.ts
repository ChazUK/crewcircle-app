import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";
import { ConvexError } from "convex/values";

import { emitContactInviteNotification } from "../../notifications/domain/emitContactInviteNotification";
import { findContactPair } from "../db/findContactPair";

export const acceptContactInvite = async (ctx: MutationCtx, inviteId: Id<"contactInvites">) => {
  const invite = await ctx.db.get(inviteId);
  if (!invite) throw new ConvexError("invite_not_found");
  if (invite.status !== "pending") throw new ConvexError("invite_not_pending");
  if (!invite.targetUserId) throw new ConvexError("invite_target_unresolved");

  const fromUserId = invite.fromUserId;
  const toUserId = invite.targetUserId;
  const now = Date.now();

  await ctx.db.patch(inviteId, { status: "accepted", respondedAt: now });

  const aToB = await findContactPair(ctx, fromUserId, toUserId);
  if (!aToB) {
    await ctx.db.insert("contacts", {
      ownerId: fromUserId,
      contactUserId: toUserId,
      createdAt: now,
      sourceInviteId: inviteId,
    });
  }
  const bToA = await findContactPair(ctx, toUserId, fromUserId);
  if (!bToA) {
    await ctx.db.insert("contacts", {
      ownerId: toUserId,
      contactUserId: fromUserId,
      createdAt: now,
      sourceInviteId: inviteId,
    });
  }

  await emitContactInviteNotification(ctx, {
    userId: fromUserId,
    kind: "contact_invite_accepted",
    inviteId,
    actorUserId: toUserId,
  });
};
