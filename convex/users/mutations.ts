import { DEPARTMENT_ROLES, type Department } from "@shared/departments/departments";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { mutation } from "../_generated/server";
import { parseOrConvexError } from "../lib/parseOrConvexError";
import { getUserByExternalId } from "./db/getUser";
import { upsertCurrentUser } from "./domain/upsertCurrentUser";
import { departmentValidator } from "./schema";

const httpUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });

const updateProfileIdentitySchema = z.object({ nickname: z.string().trim().max(50).optional() });

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
    department: v.optional(departmentValidator),
    roles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    parseOrConvexError(completeOnboardingSchema, args);

    if (args.roles?.length) {
      if (!args.department) {
        throw new ConvexError("Department is required when roles are provided");
      }
      const validRoles = DEPARTMENT_ROLES[args.department];
      for (const role of args.roles) {
        if (!validRoles.includes(role)) {
          throw new ConvexError(
            `Role "${role}" does not belong to department "${args.department}"`,
          );
        }
      }
    }

    await ctx.db.patch(user._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      ...(args.city && { city: args.city }),
      userType: args.userType,
      ...(args.department && { department: args.department as Department }),
      ...(args.roles?.length && { roles: args.roles }),
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

export const updateProfileIdentity = mutation({
  args: { nickname: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parsed = parseOrConvexError(updateProfileIdentitySchema, args);

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    if (parsed.nickname === undefined) return;
    await ctx.db.patch(user._id, { nickname: parsed.nickname });
  },
});
