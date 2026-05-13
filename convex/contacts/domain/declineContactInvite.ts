import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";
import { ConvexError } from "convex/values";

import { emitContactInviteNotification } from "../../notifications/domain/emitContactInviteNotification";

export const declineContactInvite = async (
  ctx: MutationCtx,
  inviteId: Id<"contactInvites">,
  respondingUserId: Id<"users">,
) => {
  const invite = await ctx.db.get(inviteId);
  if (!invite) throw new ConvexError("invite_not_found");
  if (invite.status !== "pending") throw new ConvexError("invite_not_pending");
  if (invite.targetUserId !== respondingUserId) throw new ConvexError("not_invitee");

  await ctx.db.patch(inviteId, { status: "declined", respondedAt: Date.now() });

  await emitContactInviteNotification(ctx, {
    userId: invite.fromUserId,
    kind: "contact_invite_declined",
    inviteId,
    actorUserId: respondingUserId,
  });
};
