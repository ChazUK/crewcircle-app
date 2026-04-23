import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import { deleteConnectionEvents, replaceConnectionEvents } from "./db/writeEvents";
import { CalendarProvider } from "./schema";

const ParsedEventValidator = v.object({
  externalId: v.string(),
  subCalendarId: v.optional(v.string()),
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

    // Atomic prune: remove any cached events tied to a sub-calendar the user
    // just turned off. Keeps the DB tight so neither the cron nor the client
    // has to process events for disabled sub-calendars, and spares a later
    // re-sync the union-replace delete pass.
    const enabled = new Set(args.enabledSubCalendarIds);
    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("byConnection", (q) => q.eq("connectionId", args.connectionId))
      .collect();
    for (const event of existing) {
      if (event.subCalendarId && !enabled.has(event.subCalendarId)) {
        await ctx.db.delete(event._id);
      }
    }
  },
});

export const updateConnectionTokens = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    encryptedTokens: v.bytes(),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      encryptedTokens: args.encryptedTokens,
      tokenExpiresAt: args.tokenExpiresAt,
    });
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

export const deleteConnection = internalMutation({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    await deleteConnectionEvents(ctx, args.connectionId);
    await ctx.db.delete(args.connectionId);
  },
});
