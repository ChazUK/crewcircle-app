import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";
import { PaginationOptions } from "convex/server";

export const listForUser = (
  ctx: QueryCtx,
  userId: Id<"users">,
  paginationOpts: PaginationOptions,
) =>
  ctx.db
    .query("notifications")
    .withIndex("byUserAndCreatedAt", (q) => q.eq("userId", userId))
    .order("desc")
    .paginate(paginationOpts);
