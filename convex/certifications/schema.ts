import { defineTable } from "convex/server";
import { v } from "convex/values";

export const Certification = {
  userId: v.id("users"),
  name: v.string(),
  issuer: v.optional(v.string()),
  referenceNumber: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  evidenceFileId: v.optional(v.id("_storage")),
};

export const certificationsSchema = {
  certifications: defineTable(Certification)
    .index("byUserId", ["userId"])
    .index("byUserIdAndExpiresAt", ["userId", "expiresAt"]),
};
