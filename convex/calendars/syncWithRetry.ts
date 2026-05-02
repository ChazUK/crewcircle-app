"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import { calendarService } from "./service/registry";

// Backoff schedule keyed by the post-failure error count: count=1 waits 15
// minutes before the next attempt, count=2 waits 30, count=3 waits 60. A
// 4th failure (count > schedule length) leaves the badge visible and stops
// scheduling — the user must manually re-sync from the management sheet.
export const RETRY_DELAYS_MS: readonly number[] = [15 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];

// Pure retry orchestration extracted so tests can inject a mock sync
// without going through the production provider registry. The action
// handler below wires it to calendarService.sync.
export async function runSyncWithRetry(
  ctx: ActionCtx,
  connectionId: Id<"calendarConnections">,
  sync: (ctx: ActionCtx, id: Id<"calendarConnections">) => Promise<void>,
): Promise<void> {
  try {
    await sync(ctx, connectionId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const newCount: number = await ctx.runMutation(
      internal.calendars.db.incrementSyncError.incrementSyncError,
      { connectionId, errorMessage },
    );
    if (newCount <= RETRY_DELAYS_MS.length) {
      await ctx.scheduler.runAfter(
        RETRY_DELAYS_MS[newCount - 1],
        internal.calendars.syncWithRetry.syncWithRetry,
        { connectionId },
      );
    }
  }
}

export const syncWithRetry = internalAction({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    await runSyncWithRetry(ctx, args.connectionId, calendarService.sync);
  },
});
