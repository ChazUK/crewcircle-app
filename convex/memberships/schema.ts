import { defineTable } from "convex/server";
import { v } from "convex/values";

export const Membership = {
  userId: v.id("users"),
  name: v.string(),
  memberNumber: v.optional(v.string()),
};

export const membershipsSchema = {
  memberships: defineTable(Membership).index("byUserId", ["userId"]),
};
