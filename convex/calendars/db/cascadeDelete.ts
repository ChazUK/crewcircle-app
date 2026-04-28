import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { MutationCtx } from "../../_generated/server";

// Fan out calendar-data cleanup for a user by scheduling one
// `deleteConnection` per connection they own. Each scheduled run executes in
// its own transaction — so a user with thousands of cached events across
// several calendars won't blow a single mutation's read/write budget, and a
// failure on one connection doesn't take the rest down with it.
export async function scheduleDeleteUserCalendarData(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const connections = await ctx.db
    .query("calendarConnections")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
  for (const connection of connections) {
    await ctx.scheduler.runAfter(0, internal.calendars.mutations.deleteConnection, {
      connectionId: connection._id,
    });
  }
}
