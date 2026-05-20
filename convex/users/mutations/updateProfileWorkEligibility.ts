import { WORK_ELIGIBILITY_REGIONS } from "@shared/profile/workEligibility";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

export const updateProfileWorkEligibility = mutation({
  args: {
    workEligibility: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const seen = new Set<string>();
    for (const entry of args.workEligibility) {
      if (!(WORK_ELIGIBILITY_REGIONS as readonly string[]).includes(entry)) {
        throw new ConvexError(`Unknown work eligibility region: "${entry}"`);
      }
      if (seen.has(entry)) {
        throw new ConvexError(`Duplicate work eligibility region: "${entry}"`);
      }
      seen.add(entry);
    }

    await ctx.db.patch(user._id, {
      workEligibility: args.workEligibility,
    });
  },
});
