"use node";

import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { requireOwnedConnection } from "./auth/requireOwnedConnection";
import { normalizeICalUrl } from "./domain/normalizeICalUrl";
import { validateICalUrl } from "./domain/validateICalUrl";
import { calendarService } from "./service/registry";
import { syncAfterConnect } from "./syncAfterConnect";
import { runSyncWithRetry } from "./syncWithRetry";

export const connectNative = action({
  args: {
    label: v.string(),
    deviceId: v.string(),
    devicePlatform: v.union(v.literal("ios"), v.literal("android")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    connectionId: Id<"calendarConnections">;
    color: string;
    currentExternalIds: string[];
  }> => {
    const all = await ctx.runQuery(api.calendars.queries.getConnections, {});
    // Native calendars are device-local: short-circuit only when the
    // user already has a native connection from THIS device. A native
    // connection from another device coexists alongside.
    const existing = all.find((c) => c.provider === "native" && c.deviceId === args.deviceId);
    if (existing) {
      return {
        connectionId: existing._id,
        color: existing.color,
        currentExternalIds: existing.nativeCalendarIds ?? [],
      };
    }
    const connectionId: Id<"calendarConnections"> = await calendarService.connect(ctx, {
      provider: "native",
      deviceCalendarId: "",
      label: args.label,
      deviceId: args.deviceId,
      devicePlatform: args.devicePlatform,
    });
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.db.getConnectionInternal.getConnectionInternal,
      { connectionId },
    );
    return {
      connectionId,
      color: connection?.color ?? "#6366f1",
      currentExternalIds: [],
    };
  },
});

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

export const connectMicrosoft = action({
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
      provider: "microsoft",
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
    return { connectionId, color: connection?.color ?? "#0078d4" };
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

export const syncNativeOnOpen = action({
  args: { deviceId: v.optional(v.string()) },
  handler: async (
    ctx,
    args,
  ): Promise<{ connectionId: Id<"calendarConnections">; nativeCalendarIds: string[] }[]> => {
    return await calendarService.syncNativeOnOpen(ctx, args.deviceId);
  },
});

export const setEnabledSubCalendars = action({
  args: {
    connectionId: v.id("calendarConnections"),
    selections: v.array(
      v.object({
        externalId: v.string(),
        label: v.string(),
        color: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { connection } = await requireOwnedConnection(ctx, args.connectionId);
    await calendarService.setEnabledSubCalendars(ctx, args.connectionId, args.selections);
    if (connection.provider !== "native") {
      await syncAfterConnect(ctx, args.connectionId);
    }
  },
});

export const connectIcal = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<{ connectionId: Id<"calendarConnections"> }> => {
    // The connect form advertises Webcal support — webcal:// and webcals://
    // are subscription-scheme hints, not real wire protocols. Rewrite to
    // http:// and https:// respectively before validation and storage.
    const url = normalizeICalUrl(args.url);
    const validation = await validateICalUrl(url);
    if (!validation.valid) {
      if (validation.reason === "unreachable") {
        throw new Error("ICAL_UNREACHABLE");
      }
      throw new Error("ICAL_INVALID");
    }
    const connectionId = await calendarService.connect(ctx, {
      provider: "ical",
      url,
    });
    return { connectionId };
  },
});
