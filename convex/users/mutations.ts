import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { assertMaxLength } from "../lib/stringValidation";
import { getUserByExternalId } from "./db/getUser";
import { upsertCurrentUser } from "./domain/upsertCurrentUser";
import { assertSafeProfileUrl } from "./domain/urlValidation";

export const upsertUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("Not authenticated");

    return upsertCurrentUser(ctx, identity);
  },
});

export const completeOnboarding = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    userType: v.union(v.literal("crew"), v.literal("production-manager")),
    departments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    assertMaxLength(args.firstName, "firstName", 100);
    assertMaxLength(args.lastName, "lastName", 100);

    await ctx.db.patch(user._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      ...(args.phone && { phone: args.phone }),
      ...(args.city && { city: args.city }),
      userType: args.userType,
      ...(args.departments?.[0] && { department: args.departments[0] }),
      hasCompletedOnboarding: true,
    });
  },
});

export const updateProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    imdbUrl: v.optional(v.string()),
    cvUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    assertMaxLength(args.bio, "bio", 1000);
    assertSafeProfileUrl(args.website, "website");
    assertSafeProfileUrl(args.imdbUrl, "imdbUrl");
    assertSafeProfileUrl(args.cvUrl, "cvUrl");

    await ctx.db.patch(user._id, {
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.website !== undefined && { website: args.website }),
      ...(args.imdbUrl !== undefined && { imdbUrl: args.imdbUrl }),
      ...(args.cvUrl !== undefined && { cvUrl: args.cvUrl }),
    });
  },
});
