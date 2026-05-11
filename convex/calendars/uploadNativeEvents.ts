import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { requireOwnedConnection } from "./auth/requireOwnedConnection";
import { currentSyncWindow } from "./service";

const incomingEventValidator = v.object({
  externalId: v.string(),
  subCalendarId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  startsAt: v.number(),
  endsAt: v.number(),
  isAllDay: v.boolean(),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  originalTimezone: v.optional(v.string()),
});

// Must match writeEvents' MAX_EVENTS_PER_CALL — kept in sync by the test
// `throws when called with more than 200 events` in writeEvents.test.ts.
const WRITE_EVENTS_CHUNK_SIZE = 200;

export const uploadNativeEvents = action({
  args: {
    connectionId: v.id("calendarConnections"),
    events: v.array(incomingEventValidator),
  },
  handler: async (ctx, args) => {
    const { connection } = await requireOwnedConnection(ctx, args.connectionId);
    if (connection.provider !== "native") {
      throw new Error(
        `uploadNativeEvents only accepts connections with provider="native" (got "${connection.provider}")`,
      );
    }

    const window = currentSyncWindow();

    const subCalendarRows: Doc<"calendarSubCalendars">[] = await ctx.runQuery(
      internal.calendars.db.getSubCalendarsForConnection.getSubCalendarsForConnection,
      { connectionId: args.connectionId },
    );
    const subCalendarsByExternalId = new Map(subCalendarRows.map((row) => [row.externalId, row]));

    const groups = new Map<string, (typeof args.events)[number][]>();
    for (const event of args.events) {
      const list = groups.get(event.subCalendarId);
      if (list) list.push(event);
      else groups.set(event.subCalendarId, [event]);
    }

    for (const [externalSubCalendarId, eventsInGroup] of groups) {
      const subCalendar = subCalendarsByExternalId.get(externalSubCalendarId);
      if (!subCalendar) continue;

      // Same allowlist on every chunk so writeEvents' window-prune doesn't
      // delete events that live in a sibling chunk for this sub-calendar.
      const pruneAllowlist = eventsInGroup.map((event) => event.externalId);

      for (let i = 0; i < eventsInGroup.length; i += WRITE_EVENTS_CHUNK_SIZE) {
        const chunk = eventsInGroup.slice(i, i + WRITE_EVENTS_CHUNK_SIZE);
        await ctx.runMutation(internal.calendars.db.writeEvents.writeEvents, {
          connectionId: args.connectionId,
          subCalendarId: subCalendar._id,
          syncWindow: window,
          events: chunk.map((e) => ({
            externalId: e.externalId,
            title: e.title,
            description: e.description,
            location: e.location,
            startsAt: e.startsAt,
            endsAt: e.endsAt,
            isAllDay: e.isAllDay,
            startDate: e.startDate,
            endDate: e.endDate,
            originalTimezone: e.originalTimezone,
          })),
          pruneAllowlist,
        });
      }
    }

    await ctx.runMutation(internal.calendars.db.markConnectionSynced.markConnectionSynced, {
      connectionId: args.connectionId,
    });
  },
});
