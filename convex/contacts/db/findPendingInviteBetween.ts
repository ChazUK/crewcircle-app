import { Doc, Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const findPendingInviteBetween = async (
  ctx: QueryCtx,
  fromUserId: Id<"users">,
  targetUserId: Id<"users">,
): Promise<Doc<"contactInvites"> | null> => {
  const forward = await ctx.db
    .query("contactInvites")
    .withIndex("byFromUserAndStatus", (q) => q.eq("fromUserId", fromUserId).eq("status", "pending"))
    .collect();
  const forwardHit = forward.find((row) => row.targetUserId === targetUserId);
  if (forwardHit) return forwardHit;

  const reverse = await ctx.db
    .query("contactInvites")
    .withIndex("byFromUserAndStatus", (q) =>
      q.eq("fromUserId", targetUserId).eq("status", "pending"),
    )
    .collect();
  return reverse.find((row) => row.targetUserId === fromUserId) ?? null;
};
