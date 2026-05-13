import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireCurrentUser } from "../contacts/db/requireCurrentUser";
import { listUnreadForUser } from "./db/listUnreadForUser";
import { markRead } from "./db/markRead";

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const me = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new ConvexError("notification_not_found");
    if (notification.userId !== me._id) throw new ConvexError("not_owner");
    if (notification.readAt) return;
    await markRead(ctx, args.notificationId);
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireCurrentUser(ctx);
    const unread = await listUnreadForUser(ctx, me._id);
    const now = Date.now();
    for (const row of unread) {
      await ctx.db.patch(row._id, { readAt: now });
    }
  },
});
