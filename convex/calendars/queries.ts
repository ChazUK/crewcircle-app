import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { getUserByExternalId } from "../users/db/getUser";

async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await getUserByExternalId(ctx, identity.subject);
  if (!user) throw new Error("User not found");
  return user;
}

export const getConnections = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const connections = await ctx.db
      .query("calendarConnections")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .collect();

    return Promise.all(
      connections.map(async (connection) => {
        const subCalendars = await ctx.db
          .query("calendarSubCalendars")
          .withIndex("byConnection", (q) => q.eq("connectionId", connection._id))
          .collect();
        return {
          _id: connection._id,
          provider: connection.provider,
          label: connection.label,
          color: connection.color,
          lastSyncedAt: connection.lastSyncedAt,
          lastSyncError: connection.lastSyncError,
          syncErrorCount: connection.syncErrorCount,
          subCalendarCount: subCalendars.length,
          nativeCalendarIds:
            connection.provider === "native" ? subCalendars.map((sc) => sc.externalId) : undefined,
        };
      }),
    );
  },
});

async function fetchEventsInRange(
  ctx: QueryCtx,
  userId: Id<"users">,
  startMs: number,
  endMs: number,
) {
  const events = await ctx.db
    .query("calendarEvents")
    .withIndex("byUserStartsAt", (q) =>
      q.eq("userId", userId).gte("startsAt", startMs).lt("startsAt", endMs),
    )
    .collect();

  const uniqueConnectionIds = [...new Set(events.map((event) => event.connectionId))];
  const connections = await Promise.all(uniqueConnectionIds.map((id) => ctx.db.get(id)));
  const colorByConnection = new Map<Id<"calendarConnections">, string>();
  uniqueConnectionIds.forEach((id, index) => {
    colorByConnection.set(id, connections[index]?.color ?? "");
  });

  return events.map((event) => ({
    ...event,
    color: colorByConnection.get(event.connectionId) ?? "",
  }));
}

export const getEventsForDateRange = query({
  args: { startMs: v.number(), endMs: v.number() },
  handler: async (ctx, { startMs, endMs }) => {
    const user = await requireUser(ctx);
    return fetchEventsInRange(ctx, user._id, startMs, endMs);
  },
});

export const getEventsForDate = query({
  args: { startMs: v.number(), endMs: v.number() },
  handler: async (ctx, { startMs, endMs }) => {
    const user = await requireUser(ctx);
    const events = await fetchEventsInRange(ctx, user._id, startMs, endMs);
    return events.sort((a, b) => {
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
      return a.startsAt - b.startsAt;
    });
  },
});
