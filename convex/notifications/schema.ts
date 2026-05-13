import { defineTable } from "convex/server";
import { v } from "convex/values";

export const NotificationKind = v.union(
  v.literal("contact_invite_received"),
  v.literal("contact_invite_accepted"),
  v.literal("contact_invite_declined"),
);

export const Notification = {
  userId: v.id("users"),
  kind: NotificationKind,
  payload: v.object({
    inviteId: v.id("contactInvites"),
    actorUserId: v.optional(v.id("users")),
  }),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
};

export const notificationsSchema = {
  notifications: defineTable(Notification)
    .index("byUserAndReadAt", ["userId", "readAt"])
    .index("byUserAndCreatedAt", ["userId", "createdAt"]),
};
