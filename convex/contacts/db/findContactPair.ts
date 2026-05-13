import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const findContactPair = (ctx: QueryCtx, ownerId: Id<"users">, contactUserId: Id<"users">) =>
  ctx.db
    .query("contacts")
    .withIndex("byOwnerAndContact", (q) =>
      q.eq("ownerId", ownerId).eq("contactUserId", contactUserId),
    )
    .unique();
