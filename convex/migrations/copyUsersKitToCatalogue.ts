import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { findOrCreateCatalogueEntry } from "../kit/lib/findOrCreateCatalogueEntry";
import { normalizeKitName } from "../kit/lib/normalizeKitName";

export const copyUsersKitToCatalogue = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const results = await ctx.db
      .query("users")
      .paginate({ numItems: 100, cursor: cursor ?? null });

    let processed = 0;
    for (const user of results.page) {
      const kit = (user as Record<string, unknown>).kit as string[] | undefined;
      if (!kit || kit.length === 0) continue;

      const seen = new Set<string>();
      for (const rawName of kit) {
        const normalized = normalizeKitName(rawName);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        const catalogueId = await findOrCreateCatalogueEntry(ctx, rawName);
        await ctx.db.insert("userKit", { userId: user._id, kitCatalogueId: catalogueId });
      }

      await ctx.db.patch(user._id, { kit: undefined } as never);
      processed++;
    }

    const hasMore = !results.isDone;
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.copyUsersKitToCatalogue.copyUsersKitToCatalogue,
        { cursor: results.continueCursor },
      );
    }

    return { processed, hasMore };
  },
});
