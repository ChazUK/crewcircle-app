import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const listUnreadForUser = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("notifications")
    .withIndex("byUserAndReadAt", (q) => q.eq("userId", userId).eq("readAt", undefined))
    .collect();
