import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

export const updateProductionCompany = mutation({
  args: {
    productionCompany: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    if (user.userType !== "production-manager") {
      throw new ConvexError("Only production manager accounts can update production company");
    }

    if (args.productionCompany !== undefined) {
      const trimmed = args.productionCompany.trim();
      if (trimmed.length > 100) {
        throw new ConvexError("Production company must be 100 characters or fewer");
      }
      await ctx.db.patch(user._id, {
        productionCompany: trimmed === "" ? undefined : trimmed,
      });
    }
  },
});
