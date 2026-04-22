import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { getUserByExternalId } from "./db/getUser";
import { upsertCurrentUser } from "./domain/upsertCurrentUser";

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
    city: v.string(),
    userType: v.union(v.literal("crew"), v.literal("production-manager")),
    departments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      ...(args.phone && { phone: args.phone }),
      city: args.city,
      userType: args.userType,
      ...(args.departments?.[0] && { department: args.departments[0] }),
      hasCompletedOnboarding: true,
    });
  },
});
