import { FLUENCY_LEVELS } from "@shared/profile/languages";
import { LANGUAGE_CODES } from "@shared/profile/languages";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

export const updateProfileLanguages = mutation({
  args: {
    spokenLanguages: v.array(
      v.object({
        code: v.string(),
        fluency: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const seenCodes = new Set<string>();
    for (const entry of args.spokenLanguages) {
      if (!(LANGUAGE_CODES as readonly string[]).includes(entry.code)) {
        throw new ConvexError(`Unknown language code: "${entry.code}"`);
      }
      if (!(FLUENCY_LEVELS as readonly string[]).includes(entry.fluency)) {
        throw new ConvexError(`Unknown fluency level: "${entry.fluency}"`);
      }
      if (seenCodes.has(entry.code)) {
        throw new ConvexError(`Duplicate language code: "${entry.code}"`);
      }
      seenCodes.add(entry.code);
    }

    await ctx.db.patch(user._id, {
      spokenLanguages: args.spokenLanguages,
    });
  },
});
