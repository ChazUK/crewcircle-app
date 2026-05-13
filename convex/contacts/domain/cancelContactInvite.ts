import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";
import { ConvexError } from "convex/values";

export const cancelContactInvite = async (
  ctx: MutationCtx,
  inviteId: Id<"contactInvites">,
  cancellingUserId: Id<"users">,
) => {
  const invite = await ctx.db.get(inviteId);
  if (!invite) throw new ConvexError("invite_not_found");
  if (invite.status !== "pending") throw new ConvexError("invite_not_pending");
  if (invite.fromUserId !== cancellingUserId) throw new ConvexError("not_inviter");

  await ctx.db.patch(inviteId, { status: "canceled", respondedAt: Date.now() });
};
