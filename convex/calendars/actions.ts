"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { requireOwnedConnection } from "./auth/requireOwnedConnection";
import { calendarService } from "./service/registry";
import { runSyncWithRetry } from "./syncWithRetry";

export const connectGoogle = action({
  args: {
    authCode: v.string(),
    codeVerifier: v.string(),
    clientId: v.string(),
    redirectUri: v.string(),
    label: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ connectionId: Id<"calendarConnections">; color: string }> => {
    const connectionId: Id<"calendarConnections"> = await calendarService.connect(ctx, {
      provider: "google",
      authCode: args.authCode,
      codeVerifier: args.codeVerifier,
      clientId: args.clientId,
      redirectUri: args.redirectUri,
      label: args.label,
    });
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.db.getConnectionInternal.getConnectionInternal,
      { connectionId },
    );
    return { connectionId, color: connection?.color ?? "#6366f1" };
  },
});

export const setEnabledSubCalendars = action({
  args: {
    connectionId: v.id("calendarConnections"),
    selections: v.array(v.object({ externalId: v.string(), label: v.string() })),
  },
  handler: async (ctx, args) => {
    await calendarService.setEnabledSubCalendars(ctx, args.connectionId, args.selections);
  },
});

export const disconnect = action({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    await calendarService.disconnect(ctx, args.connectionId);
  },
});

export const syncNow = action({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    const { connection } = await requireOwnedConnection(ctx, args.connectionId);
    if (connection.provider === "native") {
      throw new Error("Native connections sync from the device, not the server");
    }
    await runSyncWithRetry(ctx, args.connectionId, calendarService.sync);
  },
});

export const listSubCalendars = action({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    return await calendarService.listSubCalendars(ctx, args.connectionId);
  },
});
