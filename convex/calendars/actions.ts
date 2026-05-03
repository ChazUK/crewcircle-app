"use node";

import { v } from "convex/values";

import { action } from "../_generated/server";
import { requireOwnedConnection } from "./auth/requireOwnedConnection";
import { calendarService } from "./service/registry";
import { runSyncWithRetry } from "./syncWithRetry";

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
