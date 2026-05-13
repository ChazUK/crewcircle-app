import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const listContactsForOwner = (ctx: QueryCtx, ownerId: Id<"users">) =>
  ctx.db
    .query("contacts")
    .withIndex("byOwner", (q) => q.eq("ownerId", ownerId))
    .collect();
