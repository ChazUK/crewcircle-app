import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery, query } from "../_generated/server";
import { getUserByExternalId } from "../users/db/getUser";
import { countUnreadForUser } from "./db/countUnreadForUser";
import { listForUser } from "./db/listForUser";

export const listMyNotifications = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return { page: [], isDone: true, continueCursor: "" };
    return listForUser(ctx, me._id, args.paginationOpts);
  },
});

export const myUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return 0;
    return countUnreadForUser(ctx, me._id);
  },
});

export const myUnreadIncomingInviteCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return 0;
    const pending = await ctx.db
      .query("contactInvites")
      .withIndex("byTargetUserAndStatus", (q) =>
        q.eq("targetUserId", me._id).eq("status", "pending"),
      )
      .collect();
    return pending.length;
  },
});

export const getPushTokenForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.pushToken ?? null;
  },
});
