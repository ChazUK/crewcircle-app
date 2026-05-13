import { v } from "convex/values";
import { z } from "zod";

import { mutation } from "../_generated/server";
import { parseOrConvexError } from "../lib/parseOrConvexError";
import { getUserByExternalId } from "./db/getUser";
import { upsertCurrentUser } from "./domain/upsertCurrentUser";

const httpUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });

const completeOnboardingSchema = z.object({
  firstName: z.string().max(100),
  lastName: z.string().max(100),
});

const updateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  website: httpUrl.optional(),
  imdbUrl: httpUrl.optional(),
  cvUrl: httpUrl.optional(),
});

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
    city: v.optional(v.string()),
    userType: v.union(v.literal("crew"), v.literal("production-manager")),
    departments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    parseOrConvexError(completeOnboardingSchema, args);

    await ctx.db.patch(user._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      ...(args.city && { city: args.city }),
      userType: args.userType,
      ...(args.departments?.[0] && { department: args.departments[0] }),
      hasCompletedOnboarding: true,
    });
  },
});

export const registerPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    if (user.pushToken === args.token) return;
    await ctx.db.patch(user._id, { pushToken: args.token });
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

    parseOrConvexError(updateProfileSchema, args);

    await ctx.db.patch(user._id, {
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.website !== undefined && { website: args.website }),
      ...(args.imdbUrl !== undefined && { imdbUrl: args.imdbUrl }),
      ...(args.cvUrl !== undefined && { cvUrl: args.cvUrl }),
    });
  },
});
