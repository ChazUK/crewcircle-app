import { DRIVING_LICENCES } from "@shared/profile/drivingLicences";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

export const updateProfileDrivingLicences = mutation({
  args: {
    drivingLicences: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const seen = new Set<string>();
    for (const entry of args.drivingLicences) {
      if (!(DRIVING_LICENCES as readonly string[]).includes(entry)) {
        throw new ConvexError(`Unknown driving licence: "${entry}"`);
      }
      if (seen.has(entry)) {
        throw new ConvexError(`Duplicate driving licence: "${entry}"`);
      }
      seen.add(entry);
    }

    await ctx.db.patch(user._id, {
      drivingLicences: args.drivingLicences,
    });
  },
});
