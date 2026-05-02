import type {
  CalendarConnectParams,
  CalendarProviderRegistry,
  SyncWindow,
} from "@shared/calendars";

import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export function currentSyncWindow(): SyncWindow {
  return {
    windowStartMs: Date.now() - 30 * 24 * 60 * 60 * 1000,
    windowEndMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
  };
}

export function createCalendarService(_providers: CalendarProviderRegistry) {
  return {
    async connect(_ctx: ActionCtx, _params: CalendarConnectParams): Promise<void> {
      throw new Error("Not implemented: service.connect");
    },

    async disconnect(ctx: ActionCtx, connectionId: Id<"calendarConnections">): Promise<void> {
      const user = await ctx.runQuery(api.users.queries.getCurrentUser, {});
      if (!user) throw new Error("Not authenticated");
      const connection = await ctx.runQuery(
        internal.calendars.actionHelpers.getConnectionForOwner,
        { connectionId, userId: user._id },
      );
      if (!connection) throw new Error("Calendar connection not found");
      await ctx.runMutation(internal.calendars.mutations.deleteConnection, { connectionId });
    },

    async sync(_ctx: ActionCtx, _connectionId: Id<"calendarConnections">): Promise<void> {
      throw new Error("Not implemented: service.sync");
    },

    async syncNativeOnOpen(
      _ctx: ActionCtx,
      _connectionId: Id<"calendarConnections">,
    ): Promise<void> {
      throw new Error("Not implemented: service.syncNativeOnOpen");
    },

    async listSubCalendars(
      _ctx: ActionCtx,
      _connectionId: Id<"calendarConnections">,
    ): Promise<void> {
      throw new Error("Not implemented: service.listSubCalendars");
    },

    async setEnabledSubCalendars(
      _ctx: ActionCtx,
      _connectionId: Id<"calendarConnections">,
      _subCalendarIds: string[],
    ): Promise<void> {
      throw new Error("Not implemented: service.setEnabledSubCalendars");
    },
  };
}
