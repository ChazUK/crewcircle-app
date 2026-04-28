import { paginationOptsValidator, type PaginationResult } from "convex/server";

import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

const SYNC_PAGE_SIZE = 100;

export const listConnectionsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"calendarConnections">>> => {
    return ctx.db.query("calendarConnections").paginate(args.paginationOpts);
  },
});

export const syncAllConnections = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    let cursor: string | null = null;
    while (true) {
      const page: PaginationResult<Doc<"calendarConnections">> = await ctx.runQuery(
        internal.calendars.scheduler.listConnectionsPage,
        { paginationOpts: { numItems: SYNC_PAGE_SIZE, cursor } },
      );

      for (const connection of page.page) {
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

      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    return null;
  },
});
