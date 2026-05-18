import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

export const updateProfileYears = mutation({
  args: {
    startYearInDepartment: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const year = args.startYearInDepartment;

    if (!Number.isInteger(year)) {
      throw new ConvexError("Year must be a whole number");
    }

    const currentYear = new Date().getFullYear();

    if (year < 1900) {
      throw new ConvexError("Year must be 1900 or later");
    }

    if (year > currentYear) {
      throw new ConvexError("Year cannot be in the future");
    }

    await ctx.db.patch(user._id, {
      startYearInDepartment: year,
    });
  },
});
