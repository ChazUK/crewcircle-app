import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

const PAGE_SIZE = 100;

/**
 * Rename provider literals: "apple" → "native", "outlook" → "microsoft".
 * Run once after deploying the updated schema.
 */
export const migrateProviderNames = internalAction({
  args: {},
  handler: async (ctx): Promise<{ patched: number }> => {
    let cursor: string | null = null;
    let totalPatched = 0;
    while (true) {
      const result: { patched: number; done: boolean; nextCursor: string | null } =
        await ctx.runMutation(internal.calendars.migrations.migrateProviderNamesPage, { cursor });
      totalPatched += result.patched;
      if (result.done) break;
      cursor = result.nextCursor;
    }
    return { patched: totalPatched };
  },
});

export const migrateProviderNamesPage = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (
    ctx,
    args,
  ): Promise<{ patched: number; done: boolean; nextCursor: string | null }> => {
    const page = await ctx.db
      .query("calendarConnections")
      .paginate({ numItems: PAGE_SIZE, cursor: args.cursor });

    let patched = 0;
    for (const row of page.page) {
      const provider = row.provider as string;
      if (provider === "apple") {
        await ctx.db.patch(row._id, { provider: "native" });
        patched++;
      } else if (provider === "outlook") {
        await ctx.db.patch(row._id, { provider: "microsoft" });
        patched++;
      }
    }
    return {
      patched,
      done: page.isDone,
      nextCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
