import { defineTable } from "convex/server";
import { v } from "convex/values";

export const CrewEvent = {
  userId: v.id("users"),
  title: v.string(),
  role: v.string(),
  productionTitle: v.string(),
  location: v.optional(v.string()),
  startsAt: v.number(),
  endsAt: v.number(),
};

export const crewEventsSchema = {
  crewEvents: defineTable(CrewEvent).index("byUser", ["userId"]),
};
