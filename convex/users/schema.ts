import { defineTable } from "convex/server";
import { v } from "convex/values";

export const departmentValidator = v.union(
  v.literal("Camera"),
  v.literal("Sound"),
  v.literal("Production"),
  v.literal("Direction"),
  v.literal("Editorial"),
  v.literal("Art"),
  v.literal("Costume"),
  v.literal("Hair & Makeup"),
  v.literal("Grip"),
  v.literal("Electrical"),
  v.literal("VFX"),
  v.literal("Post-Production"),
  v.literal("Stunts"),
  v.literal("Locations"),
  v.literal("Catering"),
  v.literal("Transport"),
  v.literal("Other"),
);

export const User = {
  email: v.string(),
  externalAuthId: v.string(),
  pushToken: v.optional(v.string()),

  profilePictureUrl: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  nickname: v.optional(v.string()),

  userType: v.optional(v.union(v.literal("crew"), v.literal("production-manager"))),
  department: v.optional(departmentValidator),
  roles: v.optional(v.array(v.string())),
  yearsExperience: v.optional(v.number()),
  yearsInRole: v.optional(v.number()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),
  locationBases: v.optional(v.array(v.string())),
  bio: v.optional(v.string()),
  phone: v.optional(v.string()),
  website: v.optional(v.string()),
  imdbUrl: v.optional(v.string()),
  cvUrl: v.optional(v.string()),
  specialSkills: v.optional(v.array(v.string())),
  spokenLanguages: v.optional(v.array(v.object({ language: v.string(), fluency: v.string() }))),
  passports: v.optional(v.array(v.string())),
  kit: v.optional(v.array(v.string())),

  hasCompletedOnboarding: v.boolean(),
  isPublic: v.optional(v.boolean()),
};

export const usersSchema = {
  users: defineTable(User)
    .index("byExternalAuthId", ["externalAuthId"])
    .index("byEmail", ["email"])
    .index("byPhone", ["phone"])
    .searchIndex("searchByEmail", { searchField: "email" })
    .searchIndex("searchByFirstName", { searchField: "firstName" })
    .searchIndex("searchByLastName", { searchField: "lastName" }),
};
