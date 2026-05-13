import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

const UNREAD_BADGE_CAP = 99;

export const countUnreadForUser = async (ctx: QueryCtx, userId: Id<"users">) => {
  const unread = await ctx.db
    .query("notifications")
    .withIndex("byUserAndReadAt", (q) => q.eq("userId", userId).eq("readAt", undefined))
    .take(UNREAD_BADGE_CAP + 1);
  return unread.length;
};
