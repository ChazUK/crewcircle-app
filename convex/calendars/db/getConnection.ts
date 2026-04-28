import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const getConnectionById = (ctx: QueryCtx, id: Id<"calendarConnections">) => ctx.db.get(id);

export const listConnectionsByUser = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("calendarConnections")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
