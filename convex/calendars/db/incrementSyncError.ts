import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

// Record a sync failure on a Calendar Connection: bump the failure counter
// and store the error message. Returns the new count so the caller (the
// retry wrapper) can decide whether to schedule another attempt without a
// second round-trip to the database.
export const incrementSyncError = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error(`Calendar Connection ${args.connectionId} not found`);
    }
    const newCount = connection.syncErrorCount + 1;
    await ctx.db.patch(args.connectionId, {
      syncErrorCount: newCount,
      lastSyncError: args.errorMessage,
    });
    return newCount;
  },
});
