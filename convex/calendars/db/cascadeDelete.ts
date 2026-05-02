import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";

const PAGE_SIZE = 200;

// Fan out per-connection deletion as scheduled jobs so a user with thousands
// of cached events across many calendars doesn't blow a single mutation's
// read/write budget, and a failure on one connection doesn't take the rest
// down with it.
export async function scheduleDeleteUserCalendarData(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const connections = await ctx.db
    .query("calendarConnections")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
  for (const connection of connections) {
    await ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnection, {
      connectionId: connection._id,
    });
  }
}

// Entry point for cascading deletion of a single connection. Performs no
// deletions itself — schedules the first page of sub-calendar deletion so
// that every step happens in its own retryable transaction. Callers (e.g.
// CalendarService.disconnect) must verify ownership before invoking this.
export const deleteConnection = internalMutation({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, { connectionId }) => {
    await ctx.scheduler.runAfter(
      0,
      internal.calendars.db.cascadeDelete.deleteConnectionSubCalendars,
      { connectionId },
    );
  },
});

// Process one page of sub-calendar rows for a connection. For each sub-calendar
// in the page, schedule events-deletion; then delete the sub-calendar rows.
// If a full page was returned more rows may remain — schedule a continuation.
// Otherwise schedule the final connection-row deletion.
export const deleteConnectionSubCalendars = internalMutation({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, { connectionId }) => {
    const subCalendars = await ctx.db
      .query("calendarSubCalendars")
      .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
      .take(PAGE_SIZE);

    for (const subCalendar of subCalendars) {
      await ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
        subCalendarId: subCalendar._id,
      });
    }

    for (const subCalendar of subCalendars) {
      await ctx.db.delete(subCalendar._id);
    }

    if (subCalendars.length === PAGE_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.calendars.db.cascadeDelete.deleteConnectionSubCalendars,
        { connectionId },
      );
      return;
    }

    await ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionRow, {
      connectionId,
    });
  },
});

// Delete one page of events for a sub-calendar. If a full page was returned
// more rows may remain — schedule a continuation. Used both by the cascade
// chain and by setEnabledSubCalendars when sub-calendars are deselected.
export const deleteConnectionEvents = internalMutation({
  args: { subCalendarId: v.id("calendarSubCalendars") },
  handler: async (ctx, { subCalendarId }) => {
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("bySubCalendar", (q) => q.eq("subCalendarId", subCalendarId))
      .take(PAGE_SIZE);

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    if (events.length === PAGE_SIZE) {
      await ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
        subCalendarId,
      });
    }
  },
});

// Final step in the connection cascade — delete the connection row itself.
// Runs only after all sub-calendar rows (and their events) have been removed.
export const deleteConnectionRow = internalMutation({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, { connectionId }) => {
    await ctx.db.delete(connectionId);
  },
});
