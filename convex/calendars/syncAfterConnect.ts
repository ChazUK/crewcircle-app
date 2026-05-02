import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

// Schedule an immediate sync for a freshly-connected Calendar Connection
// so the user sees their events appear without waiting up to 15 minutes
// for the cron sweep. Routed through syncWithRetry so the same backoff
// and error tracking applies as a cron-driven sync.
export async function syncAfterConnect(
  ctx: ActionCtx,
  connectionId: Id<"calendarConnections">,
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.calendars.syncWithRetry.syncWithRetry, { connectionId });
}
