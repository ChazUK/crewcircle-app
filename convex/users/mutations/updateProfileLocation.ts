import { COUNTRIES } from "@shared/countries/countries";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

const VALID_COUNTRY_CODES: Set<string> = new Set(COUNTRIES.map((c) => c.code));

export const updateProfileLocation = mutation({
  args: {
    city: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const patch: Record<string, string | undefined> = {};

    if (args.city !== undefined) {
      const trimmed = args.city.trim();
      if (trimmed.length > 100) {
        throw new ConvexError("City must be 100 characters or fewer");
      }
      patch.city = trimmed === "" ? undefined : trimmed;
    }

    if (args.country !== undefined) {
      const trimmed = args.country.trim();
      if (trimmed === "") {
        patch.country = undefined;
      } else if (!VALID_COUNTRY_CODES.has(trimmed)) {
        throw new ConvexError("Unknown country code");
      } else {
        patch.country = trimmed;
      }
    }

    await ctx.db.patch(user._id, patch);
  },
});
