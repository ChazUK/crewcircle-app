import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

export const listAllConnections = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"calendarConnections">[]> => {
    return ctx.db.query("calendarConnections").collect();
  },
});

export const syncAllConnections = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    const connections: Doc<"calendarConnections">[] = await ctx.runQuery(
      internal.calendars.scheduler.listAllConnections,
      {},
    );

    for (const connection of connections) {
      // Apple events live on the device; the client must push them via
      // uploadAppleEvents. Outlook isn't implemented yet.
      if (connection.provider === "apple" || connection.provider === "outlook") continue;

      if (connection.provider === "google") {
        await ctx.scheduler.runAfter(0, internal.calendars.google.syncGoogleConnectionInternal, {
          connectionId: connection._id,
          userId: connection.userId,
        });
        continue;
      }

      if (connection.provider === "ical") {
        await ctx.scheduler.runAfter(0, internal.calendars.actions.syncIcalConnectionInternal, {
          connectionId: connection._id,
          userId: connection.userId,
        });
        continue;
      }
    }
    return null;
  },
});
