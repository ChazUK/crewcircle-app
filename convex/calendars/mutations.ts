import { v } from "convex/values";
import { z } from "zod";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { parseOrConvexError } from "../lib/parseOrConvexError";
import { deleteConnectionEvents, replaceConnectionEvents } from "./db/writeEvents";
import { CalendarProvider } from "./schema";

const PRUNE_BATCH_SIZE = 200;

const insertConnectionSchema = z.object({ label: z.string().max(256) });

const ParsedEventValidator = v.object({
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

export const insertConnection = internalMutation({
  args: {
    userId: v.id("users"),
    provider: CalendarProvider,
    label: v.string(),
    externalAccountId: v.optional(v.string()),
    icalUrl: v.optional(v.string()),
    localCalendarId: v.optional(v.string()),
    scope: v.optional(v.string()),
    oauthClientId: v.optional(v.string()),
    encryptedTokens: v.optional(v.bytes()),
    tokenExpiresAt: v.optional(v.number()),
    enabledSubCalendarIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    parseOrConvexError(insertConnectionSchema, args);
    return ctx.db.insert("calendarConnections", {
      userId: args.userId,
      provider: args.provider,
      label: args.label,
      externalAccountId: args.externalAccountId,
      icalUrl: args.icalUrl,
      localCalendarId: args.localCalendarId,
      scope: args.scope,
      oauthClientId: args.oauthClientId,
      encryptedTokens: args.encryptedTokens,
      tokenExpiresAt: args.tokenExpiresAt,
      enabledSubCalendarIds: args.enabledSubCalendarIds,
      createdAt: Date.now(),
    });
  },
});

export const setEnabledSubCalendars = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    enabledSubCalendarIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      enabledSubCalendarIds: args.enabledSubCalendarIds,
    });

    // Fan the prune out to a scheduled mutation so accounts with many cached
    // events don't blow this transaction's read/write limits. The prune pass
    // re-reads the current selection from the connection doc each iteration.
    await ctx.scheduler.runAfter(0, internal.calendars.mutations.pruneDisabledSubCalendarEvents, {
      connectionId: args.connectionId,
      cursor: null,
    });
  },
});

export const pruneDisabledSubCalendarEvents = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return;
    const enabled = new Set(connection.enabledSubCalendarIds ?? []);

    const result = await ctx.db
      .query("calendarEvents")
      .withIndex("byConnection", (q) => q.eq("connectionId", args.connectionId))
      .paginate({ cursor: args.cursor, numItems: PRUNE_BATCH_SIZE });

    for (const event of result.page) {
      if (event.subCalendarId && !enabled.has(event.subCalendarId)) {
        await ctx.db.delete(event._id);
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.calendars.mutations.pruneDisabledSubCalendarEvents, {
        connectionId: args.connectionId,
        cursor: result.continueCursor,
      });
    }
  },
});

export const updateTokensIfNonce = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    expectedNonce: v.optional(v.string()),
    encryptedTokens: v.bytes(),
    tokenExpiresAt: v.optional(v.number()),
    newNonce: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return false;
    if (connection.refreshNonce !== args.expectedNonce) return false;
    await ctx.db.patch(args.connectionId, {
      encryptedTokens: args.encryptedTokens,
      tokenExpiresAt: args.tokenExpiresAt,
      refreshNonce: args.newNonce,
    });
    return true;
  },
});

export const markSynced = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncedAt: Date.now(),
      lastSyncError: args.error,
    });
  },
});

export const replaceEvents = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    userId: v.id("users"),
    events: v.array(ParsedEventValidator),
  },
  handler: async (ctx, args) => {
    await replaceConnectionEvents(ctx, args);
  },
});

export const deleteConnectionBatch = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { done, continueCursor } = await deleteConnectionEvents(
      ctx,
      args.connectionId,
      args.cursor,
    );
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.calendars.mutations.deleteConnectionBatch, {
        connectionId: args.connectionId,
        cursor: continueCursor,
      });
    } else {
      await ctx.db.delete(args.connectionId);
    }
  },
});

export const deleteConnection = internalMutation({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    const { done, continueCursor } = await deleteConnectionEvents(ctx, args.connectionId, null);
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.calendars.mutations.deleteConnectionBatch, {
        connectionId: args.connectionId,
        cursor: continueCursor,
      });
    } else {
      await ctx.db.delete(args.connectionId);
    }
  },
});
