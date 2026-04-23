import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import { deleteConnectionEvents, replaceConnectionEvents } from "./db/writeEvents";
import { CalendarProvider } from "./schema";

const ParsedEventValidator = v.object({
  externalId: v.string(),
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
      createdAt: Date.now(),
    });
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
