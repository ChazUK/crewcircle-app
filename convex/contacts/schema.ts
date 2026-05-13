import { defineTable } from "convex/server";
import { v } from "convex/values";

export const ContactInviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("canceled"),
  v.literal("expired"),
);

export const ContactInviteTarget = v.union(
  v.object({ kind: v.literal("user"), userId: v.id("users") }),
  v.object({ kind: v.literal("email"), email: v.string() }),
  v.object({ kind: v.literal("phone"), phone: v.string() }),
);

export const Contact = {
  ownerId: v.id("users"),
  contactUserId: v.id("users"),
  createdAt: v.number(),
  sourceInviteId: v.optional(v.id("contactInvites")),
  nickname: v.optional(v.string()),
  circleIds: v.optional(v.array(v.string())),
};

export const ContactInvite = {
  fromUserId: v.id("users"),
  target: ContactInviteTarget,
  targetUserId: v.optional(v.id("users")),
  targetEmail: v.optional(v.string()),
  targetPhone: v.optional(v.string()),
  status: ContactInviteStatus,
  message: v.optional(v.string()),
  createdAt: v.number(),
  respondedAt: v.optional(v.number()),
  convertedFromTarget: v.optional(v.union(v.literal("email"), v.literal("phone"))),
};

export const contactsSchema = {
  contacts: defineTable(Contact)
    .index("byOwner", ["ownerId"])
    .index("byOwnerAndContact", ["ownerId", "contactUserId"]),
  contactInvites: defineTable(ContactInvite)
    .index("byFromUserAndStatus", ["fromUserId", "status"])
    .index("byTargetUserAndStatus", ["targetUserId", "status"])
    .index("byTargetEmailAndStatus", ["targetEmail", "status"])
    .index("byTargetPhoneAndStatus", ["targetPhone", "status"]),
};
