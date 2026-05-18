import { PRODUCTION_TYPES } from "@shared/profile/productionTypes";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

export const updateProfileProductionTypes = mutation({
  args: {
    productionTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const seen = new Set<string>();
    for (const entry of args.productionTypes) {
      if (!(PRODUCTION_TYPES as readonly string[]).includes(entry)) {
        throw new ConvexError(`Unknown production type: "${entry}"`);
      }
      if (seen.has(entry)) {
        throw new ConvexError(`Duplicate production type: "${entry}"`);
      }
      seen.add(entry);
    }

    await ctx.db.patch(user._id, {
      productionTypes: args.productionTypes,
    });
  },
});
