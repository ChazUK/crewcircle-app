import { COUNTRIES } from "@shared/countries/countries";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

const VALID_COUNTRY_CODES: Set<string> = new Set(COUNTRIES.map((c) => c.code));

export const updateProfilePassports = mutation({
  args: {
    passports: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const seen = new Set<string>();
    for (const code of args.passports) {
      if (!VALID_COUNTRY_CODES.has(code)) {
        throw new ConvexError(`Unknown country code: "${code}"`);
      }
      if (seen.has(code)) {
        throw new ConvexError(`Duplicate country code: "${code}"`);
      }
      seen.add(code);
    }

    await ctx.db.patch(user._id, {
      passports: args.passports,
    });
  },
});
