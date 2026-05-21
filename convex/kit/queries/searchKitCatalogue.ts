import { v } from "convex/values";

import { query } from "../../_generated/server";
import { normalizeKitName } from "../lib/normalizeKitName";

export const searchKitCatalogue = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizeKitName(args.query);
    if (normalized.length === 0) return [];

    const all = await ctx.db.query("kitCatalogue").collect();

    return all
      .filter((row) => row.normalizedName.includes(normalized))
      .slice(0, 20)
      .map((row) => ({ id: row._id, name: row.name }));
  },
});
