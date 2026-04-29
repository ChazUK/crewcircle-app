import { ConvexError, v } from "convex/values";

import { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getUserByExternalId } from "../users/db/getUser";
import { listConnectionsByUser } from "./db/getConnection";

type SafeConnection = {
  _id: Doc<"calendarConnections">["_id"];
  _creationTime: number;
  provider: Doc<"calendarConnections">["provider"];
  label: string;
  externalAccountId?: string;
  icalUrl?: string;
  localCalendarId?: string;
  enabledSubCalendarIds?: string[];
  lastSyncedAt?: number;
  lastSyncError?: string;
  createdAt: number;
};

function toSafe(doc: Doc<"calendarConnections">): SafeConnection {
  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    provider: doc.provider,
    label: doc.label,
    externalAccountId: doc.externalAccountId,
    icalUrl: doc.icalUrl,
    localCalendarId: doc.localCalendarId,
    enabledSubCalendarIds: doc.enabledSubCalendarIds,
    lastSyncedAt: doc.lastSyncedAt,
    lastSyncError: doc.lastSyncError,
    createdAt: doc.createdAt,
  };
}

export const listConnections = query({
  args: {},
  handler: async (ctx): Promise<SafeConnection[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) return [];
    const connections = await listConnectionsByUser(ctx, user._id);
    return connections.map(toSafe);
  },
});

// Widen the startsAt lower bound so we pick up events that began before the
// query window but still overlap it (multi-day holidays, week-long retreats,
// long-running meetings). A one-year buffer covers every practical calendar
// event; we then narrow back to genuine overlaps with an in-memory filter on
// endsAt.
const OVERLAP_LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 2000;

export const listEventsInRange = query({
  args: {
    startsAtMs: v.number(),
    endsAtMs: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.endsAtMs - args.startsAtMs > MAX_RANGE_MS) {
      throw new ConvexError("Date range exceeds the maximum allowed window of 90 days");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) return [];

    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("byUserStartsAt", (q) =>
        q
          .eq("userId", user._id)
          .gte("startsAt", args.startsAtMs - OVERLAP_LOOKBACK_MS)
          .lt("startsAt", args.endsAtMs),
      )
      .take(MAX_EVENTS);

    return events
      .filter((event) => event.endsAt > args.startsAtMs)
      .map((event) => ({
        _id: event._id,
        connectionId: event.connectionId,
        subCalendarId: event.subCalendarId,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        isAllDay: event.isAllDay,
      }));
  },
});
