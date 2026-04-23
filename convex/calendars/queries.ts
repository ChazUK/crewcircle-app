import { v } from "convex/values";

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

export const listEventsInRange = query({
  args: {
    startsAtMs: v.number(),
    endsAtMs: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) return [];

    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("byUserStartsAt", (q) =>
        q.eq("userId", user._id).gte("startsAt", args.startsAtMs).lt("startsAt", args.endsAtMs),
      )
      .collect();

    return events.map((event) => ({
      _id: event._id,
      connectionId: event.connectionId,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      isAllDay: event.isAllDay,
    }));
  },
});
