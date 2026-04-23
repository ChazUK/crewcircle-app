import { v } from "convex/values";

import { Doc, Id } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";

export const getConnectionForOwner = internalQuery({
  args: { connectionId: v.id("calendarConnections"), userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"calendarConnections"> | null> => {
    const doc = await ctx.db.get(args.connectionId);
    if (!doc) return null;
    if (doc.userId !== args.userId) return null;
    return doc;
  },
});

export const getConnectionInternal = internalQuery({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args): Promise<Doc<"calendarConnections"> | null> => {
    return ctx.db.get(args.connectionId);
  },
});

export type SafeUser = { _id: Id<"users"> };
