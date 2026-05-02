import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";

const SHARD_SIZE = 200;
const FAN_OUT = 5;
const DISCOVERY_LIMIT = SHARD_SIZE * FAN_OUT;

const cursorArg = v.optional(v.union(v.string(), v.null()));

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
  await Promise.all(
    connections.map((connection) =>
      ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnection, {
        connectionId: connection._id,
      }),
    ),
  );
}

// Entry point for cascading deletion of a single connection. Performs no
// deletions itself — schedules the first discovery cycle of sub-calendar
// deletion so that every step happens in its own retryable transaction.
// Callers (e.g. CalendarService.disconnect) must verify ownership before
// invoking this.
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

// Discover one cycle of sub-calendar IDs for a connection and fan them out
// for parallel deletion. For each sub-calendar discovered, schedule its
// events deletion. Partition the IDs themselves into shards and schedule
// each shard as an independent worker so up to FAN_OUT row deletions run
// concurrently. If the discovery returned a full page, schedule a
// continuation with the pagination cursor — the cursor positions the next
// discovery past the IDs the parallel shards are about to delete, so they
// don't collide. Otherwise, schedule the final connection-row deletion.
export const deleteConnectionSubCalendars = internalMutation({
  args: { connectionId: v.id("calendarConnections"), cursor: cursorArg },
  handler: async (ctx, { connectionId, cursor }) => {
    const result = await ctx.db
      .query("calendarSubCalendars")
      .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
      .paginate({ numItems: DISCOVERY_LIMIT, cursor: cursor ?? null });

    const subCalendarIds = result.page.map((sc) => sc._id);
    const work: Promise<unknown>[] = [];

    for (const subCalendarId of subCalendarIds) {
      work.push(
        ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
          subCalendarId,
        }),
      );
    }

    for (let i = 0; i < subCalendarIds.length; i += SHARD_SIZE) {
      const ids = subCalendarIds.slice(i, i + SHARD_SIZE);
      work.push(
        ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteSubCalendarsByIds, {
          ids,
        }),
      );
    }

    if (result.isDone) {
      work.push(
        ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionRow, {
          connectionId,
        }),
      );
    } else {
      work.push(
        ctx.scheduler.runAfter(
          0,
          internal.calendars.db.cascadeDelete.deleteConnectionSubCalendars,
          { connectionId, cursor: result.continueCursor },
        ),
      );
    }

    await Promise.all(work);
  },
});

// Discover one cycle of event IDs for a sub-calendar and fan them out for
// parallel deletion via deleteEventsByIds shards. If a full page was
// returned, schedule a continuation with the pagination cursor — the
// cursor lets the next discovery skip past IDs the parallel shards are
// deleting so they don't contend on the same rows. Used both by the
// cascade chain and by setEnabledSubCalendars when sub-calendars are
// deselected.
export const deleteConnectionEvents = internalMutation({
  args: { subCalendarId: v.id("calendarSubCalendars"), cursor: cursorArg },
  handler: async (ctx, { subCalendarId, cursor }) => {
    const result = await ctx.db
      .query("calendarEvents")
      .withIndex("bySubCalendar", (q) => q.eq("subCalendarId", subCalendarId))
      .paginate({ numItems: DISCOVERY_LIMIT, cursor: cursor ?? null });

    const eventIds = result.page.map((e) => e._id);
    const work: Promise<unknown>[] = [];

    for (let i = 0; i < eventIds.length; i += SHARD_SIZE) {
      const ids = eventIds.slice(i, i + SHARD_SIZE);
      work.push(
        ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteEventsByIds, {
          ids,
        }),
      );
    }

    if (!result.isDone) {
      work.push(
        ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
          subCalendarId,
          cursor: result.continueCursor,
        }),
      );
    }

    await Promise.all(work);
  },
});

// Worker — delete an explicit list of event rows in parallel. Independent
// of any index read, so multiple shards run without contention.
export const deleteEventsByIds = internalMutation({
  args: { ids: v.array(v.id("calendarEvents")) },
  handler: async (ctx, { ids }) => {
    await Promise.all(ids.map((id) => ctx.db.delete(id)));
  },
});

// Worker — delete an explicit list of sub-calendar rows in parallel.
export const deleteSubCalendarsByIds = internalMutation({
  args: { ids: v.array(v.id("calendarSubCalendars")) },
  handler: async (ctx, { ids }) => {
    await Promise.all(ids.map((id) => ctx.db.delete(id)));
  },
});

// Final step in the connection cascade — delete the connection row itself.
// Scheduled by the discovery cycle that exhausted the sub-calendar pages.
// Does not strictly run after every events shard finishes (no FK
// constraint to enforce ordering), but the connection row is small and
// orphaned events would be invisible to clients without it anyway.
export const deleteConnectionRow = internalMutation({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, { connectionId }) => {
    await ctx.db.delete(connectionId);
  },
});
