import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

const MAX_EVENTS_PER_CALL = 200;

const incomingEventValidator = v.object({
  externalId: v.string(),
  subCalendarId: v.optional(v.string()),
  uid: v.optional(v.string()),
  recurrenceId: v.optional(v.number()),
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

export const writeEvents = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    subCalendarId: v.id("calendarSubCalendars"),
    syncWindow: v.object({
      windowStartMs: v.number(),
      windowEndMs: v.number(),
    }),
    events: v.array(incomingEventValidator),
    deletedExternalIds: v.optional(v.array(v.string())),
    // Caller-supplied superset of external IDs that should survive the
    // window-prune. Required when chunking a sub-calendar's events across
    // multiple writeEvents calls — otherwise the second chunk would prune
    // the first chunk's upserts. When omitted, the prune set defaults to
    // this call's `events` (single-call semantics).
    pruneAllowlist: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.events.length > MAX_EVENTS_PER_CALL) {
      throw new Error(
        `writeEvents accepts at most ${MAX_EVENTS_PER_CALL} events per call (received ${args.events.length}). Chunk the batch in the caller.`,
      );
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error(`writeEvents: connection ${args.connectionId} not found`);
    }
    const userId = connection.userId;
    const now = Date.now();

    for (const event of args.events) {
      if (event.isAllDay && (!event.startDate || !event.endDate)) {
        throw new Error(
          `writeEvents: all-day event ${event.externalId} is missing startDate/endDate`,
        );
      }

      const existing = await ctx.db
        .query("calendarEvents")
        .withIndex("byConnectionExternal", (q) =>
          q.eq("connectionId", args.connectionId).eq("externalId", event.externalId),
        )
        .unique();

      const fields = {
        userId,
        connectionId: args.connectionId,
        subCalendarId: args.subCalendarId,
        externalId: event.externalId,
        uid: event.uid,
        recurrenceId: event.recurrenceId,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        isAllDay: event.isAllDay,
        startDate: event.startDate,
        endDate: event.endDate,
        originalTimezone: event.originalTimezone,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.replace(existing._id, fields);
      } else {
        await ctx.db.insert("calendarEvents", fields);
      }
    }

    const pruneSet = new Set<string>(
      args.pruneAllowlist ?? args.events.map((event) => event.externalId),
    );
    const subCalendarRows = await ctx.db
      .query("calendarEvents")
      .withIndex("bySubCalendar", (q) => q.eq("subCalendarId", args.subCalendarId))
      .collect();
    for (const row of subCalendarRows) {
      const inWindow =
        row.startsAt >= args.syncWindow.windowStartMs &&
        row.startsAt <= args.syncWindow.windowEndMs;
      if (inWindow && !pruneSet.has(row.externalId)) {
        await ctx.db.delete(row._id);
      }
    }

    if (args.deletedExternalIds && args.deletedExternalIds.length > 0) {
      for (const externalId of args.deletedExternalIds) {
        const row = await ctx.db
          .query("calendarEvents")
          .withIndex("byConnectionExternal", (q) =>
            q.eq("connectionId", args.connectionId).eq("externalId", externalId),
          )
          .unique();
        if (row) {
          await ctx.db.delete(row._id);
        }
      }
    }
  },
});
