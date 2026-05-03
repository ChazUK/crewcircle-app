import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const syncAllConnections = internalMutation({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db.query("calendarConnections").withIndex("byUser").collect();
    for (const connection of connections) {
      if (connection.provider === "native") continue;
      await ctx.scheduler.runAfter(0, internal.calendars.syncWithRetry.syncWithRetry, {
        connectionId: connection._id,
      });
    }
  },
});
