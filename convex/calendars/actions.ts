import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { ActionCtx, action, internalAction } from "../_generated/server";
import { parseIcs } from "./domain/parseIcs";

const EventInputValidator = v.object({
  externalId: v.string(),
  subCalendarId: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  startsAt: v.number(),
  endsAt: v.number(),
  isAllDay: v.boolean(),
});

async function requireUser(ctx: ActionCtx): Promise<Doc<"users">> {
  const user: Doc<"users"> | null = await ctx.runQuery(api.users.queries.getCurrentUser, {});
  if (!user) throw new Error("Not authenticated");
  return user;
}

function safeHostname(raw: string) {
  try {
    return new URL(raw).hostname;
  } catch {
    return "Calendar";
  }
}

async function fetchAndStoreIcal(
  ctx: ActionCtx,
  args: { connectionId: Id<"calendarConnections">; userId: Id<"users">; url: string },
) {
  const res = await fetch(args.url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch iCal feed (status ${res.status})`);
  const body = await res.text();
  const events = parseIcs(body);
  await ctx.runMutation(internal.calendars.mutations.replaceEvents, {
    connectionId: args.connectionId,
    userId: args.userId,
    events,
  });
  await ctx.runMutation(internal.calendars.mutations.markSynced, {
    connectionId: args.connectionId,
    error: undefined,
  });
}

export const connectIcal = action({
  args: { url: v.string(), label: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"calendarConnections">> => {
    const user = await requireUser(ctx);
    const trimmedLabel = args.label?.trim();

    const connectionId: Id<"calendarConnections"> = await ctx.runMutation(
      internal.calendars.mutations.insertConnection,
      {
        userId: user._id,
        provider: "ical",
        label: trimmedLabel || safeHostname(args.url),
        icalUrl: args.url,
      },
    );

    try {
      await fetchAndStoreIcal(ctx, { connectionId, userId: user._id, url: args.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await ctx.runMutation(internal.calendars.mutations.markSynced, {
        connectionId,
        error: message,
      });
      throw err;
    }
    return connectionId;
  },
});

export const connectApple = action({
  args: {
    label: v.string(),
    enabledSubCalendarIds: v.array(v.string()),
    events: v.array(EventInputValidator),
  },
  handler: async (ctx, args): Promise<Id<"calendarConnections">> => {
    const user = await requireUser(ctx);
    const connectionId: Id<"calendarConnections"> = await ctx.runMutation(
      internal.calendars.mutations.insertConnection,
      {
        userId: user._id,
        provider: "apple",
        label: args.label,
        enabledSubCalendarIds: args.enabledSubCalendarIds,
      },
    );
    await ctx.runMutation(internal.calendars.mutations.replaceEvents, {
      connectionId,
      userId: user._id,
      events: args.events,
    });
    await ctx.runMutation(internal.calendars.mutations.markSynced, {
      connectionId,
      error: undefined,
    });
    return connectionId;
  },
});

export const uploadAppleEvents = action({
  args: {
    connectionId: v.id("calendarConnections"),
    events: v.array(EventInputValidator),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionForOwner,
      { connectionId: args.connectionId, userId: user._id },
    );
    if (!connection) throw new Error("Calendar connection not found");
    if (connection.provider !== "apple") {
      throw new Error("uploadAppleEvents only supports Apple calendars");
    }
    await ctx.runMutation(internal.calendars.mutations.replaceEvents, {
      connectionId: args.connectionId,
      userId: user._id,
      events: args.events,
    });
    await ctx.runMutation(internal.calendars.mutations.markSynced, {
      connectionId: args.connectionId,
      error: undefined,
    });
    return null;
  },
});

export const syncConnection = action({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionForOwner,
      { connectionId: args.connectionId, userId: user._id },
    );
    if (!connection) throw new Error("Calendar connection not found");

    if (connection.provider === "ical") {
      if (!connection.icalUrl) throw new Error("Missing iCal URL");
      try {
        await fetchAndStoreIcal(ctx, {
          connectionId: args.connectionId,
          userId: user._id,
          url: connection.icalUrl,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown sync error";
        await ctx.runMutation(internal.calendars.mutations.markSynced, {
          connectionId: args.connectionId,
          error: message,
        });
        throw err;
      }
      return null;
    }

    if (connection.provider === "google") {
      await ctx.runAction(internal.calendars.google.syncGoogleConnectionInternal, {
        connectionId: args.connectionId,
        userId: user._id,
      });
      return null;
    }

    if (connection.provider === "apple") {
      // Apple events originate on-device; the client must call uploadAppleEvents.
      throw new Error("Apple calendars must be re-synced from the device");
    }

    throw new Error(`Sync not supported for provider "${connection.provider}"`);
  },
});

export const syncIcalConnectionInternal = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<null> => {
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionInternal,
      { connectionId: args.connectionId },
    );
    if (!connection || connection.userId !== args.userId) {
      throw new Error("Calendar connection not found");
    }
    if (connection.provider !== "ical" || !connection.icalUrl) {
      throw new Error("syncIcalConnectionInternal requires an iCal connection");
    }
    try {
      await fetchAndStoreIcal(ctx, {
        connectionId: args.connectionId,
        userId: args.userId,
        url: connection.icalUrl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await ctx.runMutation(internal.calendars.mutations.markSynced, {
        connectionId: args.connectionId,
        error: message,
      });
      // Don't rethrow — the cron scheduler fans out per-connection, we let
      // one failure record its error without poisoning siblings.
    }
    return null;
  },
});

export const setEnabledSubCalendars = action({
  args: {
    connectionId: v.id("calendarConnections"),
    enabledSubCalendarIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionForOwner,
      { connectionId: args.connectionId, userId: user._id },
    );
    if (!connection) throw new Error("Calendar connection not found");
    await ctx.runMutation(internal.calendars.mutations.setEnabledSubCalendars, {
      connectionId: args.connectionId,
      enabledSubCalendarIds: args.enabledSubCalendarIds,
    });

    // Trigger a fresh sync so the events cache reflects the new selection.
    // Apple events are pushed from the device — the client will call
    // uploadAppleEvents itself after changing its selection.
    if (connection.provider === "google") {
      await ctx.runAction(internal.calendars.google.syncGoogleConnectionInternal, {
        connectionId: args.connectionId,
        userId: user._id,
      });
    } else if (connection.provider === "ical" && connection.icalUrl) {
      try {
        await fetchAndStoreIcal(ctx, {
          connectionId: args.connectionId,
          userId: user._id,
          url: connection.icalUrl,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown sync error";
        await ctx.runMutation(internal.calendars.mutations.markSynced, {
          connectionId: args.connectionId,
          error: message,
        });
      }
    }
    return null;
  },
});

export const disconnect = action({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionForOwner,
      { connectionId: args.connectionId, userId: user._id },
    );
    if (!connection) return null;
    await ctx.runMutation(internal.calendars.mutations.deleteConnection, {
      connectionId: args.connectionId,
    });
    return null;
  },
});
