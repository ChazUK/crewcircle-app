"use node";

import { ConvexError, v } from "convex/values";

import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { ActionCtx, action, internalAction } from "../_generated/server";
import { assertSafeIcalUrl, safeHostname } from "./domain/icalUrl";
import { orchestrator } from "./orchestrator/registry";

const EventInputValidator = v.object({
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
});

async function requireUser(ctx: ActionCtx): Promise<Doc<"users">> {
  const user: Doc<"users"> | null = await ctx.runQuery(api.users.queries.getCurrentUser, {});
  if (!user) throw new Error("Not authenticated");
  return user;
}

export const connectIcal = action({
  args: { url: v.string(), label: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"calendarConnections">> => {
    const user = await requireUser(ctx);
    const trimmedLabel = args.label?.trim();
    const safeUrl = assertSafeIcalUrl(args.url);

    const connectionId: Id<"calendarConnections"> = await ctx.runMutation(
      internal.calendars.mutations.insertConnection,
      {
        userId: user._id,
        provider: "ical",
        label: trimmedLabel || safeHostname(safeUrl),
        icalUrl: safeUrl,
      },
    );

    await orchestrator.syncConnection(ctx, connectionId);
    return connectionId;
  },
});

export const connectNative = action({
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
        provider: "native",
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

export const uploadNativeEvents = action({
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
    if (connection.provider !== "native") {
      throw new Error("uploadNativeEvents only supports native calendar connections");
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
    if (connection.provider === "native") {
      throw new Error("Native calendars must be re-synced from the device");
    }
    await orchestrator.syncConnection(ctx, args.connectionId);
    return null;
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
    if (connection.provider !== "ical") {
      throw new Error("syncIcalConnectionInternal requires an iCal connection");
    }
    try {
      await orchestrator.syncConnection(ctx, args.connectionId);
    } catch {
      // Don't rethrow — the cron scheduler fans out per-connection; one
      // failure should not block siblings. The error is recorded by the orchestrator.
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
    if (args.enabledSubCalendarIds.length === 0) {
      throw new ConvexError(
        "enabledSubCalendarIds must contain at least one calendar ID. " +
          "To disconnect the calendar entirely, use disconnect.",
      );
    }
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
    // Native events are pushed from the device; the client calls uploadNativeEvents itself.
    if (connection.provider !== "native") {
      try {
        await orchestrator.syncConnection(ctx, args.connectionId);
      } catch {
        // Sync errors are recorded by the orchestrator; swallow so the
        // sub-calendar selection itself still succeeds.
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
