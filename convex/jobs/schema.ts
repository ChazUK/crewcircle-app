import { defineTable } from "convex/server";
import { v } from "convex/values";

export const Job = {
  status: v.union(v.literal("open"), v.literal("filled"), v.literal("cancelled")),
  title: v.string(),
  role: v.string(),
  productionTitle: v.string(),
  location: v.optional(v.string()),
  startsAt: v.number(),
  endsAt: v.number(),
  assignedUserId: v.optional(v.id("users")),
};

export const jobsSchema = {
  jobs: defineTable(Job).index("byAssignedUser", ["assignedUserId"]),
};
