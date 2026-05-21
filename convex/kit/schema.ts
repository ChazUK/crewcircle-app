import { defineTable } from "convex/server";
import { v } from "convex/values";

export const KitCatalogue = {
  name: v.string(),
  normalizedName: v.string(),
};

export const UserKit = {
  userId: v.id("users"),
  kitCatalogueId: v.id("kitCatalogue"),
};

export const kitSchema = {
  kitCatalogue: defineTable(KitCatalogue).index("byNormalizedName", ["normalizedName"]),
  userKit: defineTable(UserKit).index("byUserId", ["userId"]),
};
