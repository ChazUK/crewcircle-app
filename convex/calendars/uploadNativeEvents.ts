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
  originalTimezone: v.optional(v.string()),
});

export const uploadNativeEvents = action({
  args: {
    connectionId: v.id("calendarConnections"),
    events: v.array(incomingEventValidator),
  },
  handler: async (ctx, args) => {
    await requireOwnedConnection(ctx, args.connectionId);

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

      await ctx.runMutation(internal.calendars.db.writeEvents.writeEvents, {
        connectionId: args.connectionId,
        subCalendarId: subCalendar._id,
        syncWindow: window,
        events: eventsInGroup.map((e) => ({
          externalId: e.externalId,
          title: e.title,
          description: e.description,
          location: e.location,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          isAllDay: e.isAllDay,
          originalTimezone: e.originalTimezone,
        })),
      });
    }

    await ctx.runMutation(internal.calendars.db.markConnectionSynced.markConnectionSynced, {
      connectionId: args.connectionId,
    });
  },
});
