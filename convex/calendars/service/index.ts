import type {
  CalendarConnectParams,
  CalendarProviderRegistry,
  SubCalendar,
  SyncWindow,
} from "@shared/calendars";

import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { assignPaletteColour } from "../domain/assignPaletteColour";
import { filterSubCalendars } from "../domain/filterSubCalendars";

export function currentSyncWindow(): SyncWindow {
  return {
    windowStartMs: Date.now() - 30 * 24 * 60 * 60 * 1000,
    windowEndMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
  };
}

export function createCalendarService(providers: CalendarProviderRegistry) {
  return {
    async connect(
      ctx: ActionCtx,
      params: CalendarConnectParams,
    ): Promise<Id<"calendarConnections">> {
      const user: Doc<"users"> | null = await ctx.runQuery(api.users.queries.getCurrentUser, {});
      if (!user) throw new Error("Not authenticated");

      const usedColours: string[] = await ctx.runQuery(
        internal.calendars.actionHelpers.getConnectionColoursForUser,
        { userId: user._id },
      );
      const color = assignPaletteColour(usedColours);

      const provider = providers[params.provider];
      const connectionIdString = await provider.connect(ctx, params, {
        userId: user._id,
        color,
      });
      const connectionId = connectionIdString as Id<"calendarConnections">;

      if (params.provider === "ical") {
        try {
          await ctx.runMutation(internal.calendars.mutations.insertSubCalendar, {
            connectionId,
            externalId: connectionId,
            label: params.label,
            showAsBusy: true,
          });
        } catch (error) {
          // The connection row was created in a prior mutation; the synthetic
          // sub-calendar in this one. An iCal connection without its
          // sub-calendar can never sync, so schedule a cascade-delete to tear
          // it down before re-throwing — failing closed beats leaving the
          // user with a half-created connection they can't fix. Swallow
          // cleanup failures (logging them) so the original insertSubCalendar
          // error always surfaces to the caller — that's the error that
          // explains why the connection failed.
          try {
            await ctx.runMutation(internal.calendars.db.cascadeDelete.deleteConnection, {
              connectionId,
            });
          } catch (cleanupError) {
            console.error("Failed to roll back orphaned iCal connection", {
              connectionId,
              cleanupError,
            });
          }
          throw error;
        }
      }

      return connectionId;
    },

    async disconnect(ctx: ActionCtx, connectionId: Id<"calendarConnections">): Promise<void> {
      const user = await ctx.runQuery(api.users.queries.getCurrentUser, {});
      if (!user) throw new Error("Not authenticated");
      const connection = await ctx.runQuery(
        internal.calendars.actionHelpers.getConnectionForOwner,
        { connectionId, userId: user._id },
      );
      if (!connection) throw new Error("Calendar connection not found");
      await ctx.runMutation(internal.calendars.db.cascadeDelete.deleteConnection, { connectionId });
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
      ctx: ActionCtx,
      connectionId: Id<"calendarConnections">,
    ): Promise<SubCalendar[]> {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user: Doc<"users"> | null = await ctx.runQuery(api.users.queries.getCurrentUser, {});
      if (!user) throw new Error("User not found");

      const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
        internal.calendars.actionHelpers.getConnectionForOwner,
        { connectionId, userId: user._id },
      );
      if (!connection) throw new Error("Connection not found");

      const provider = providers[connection.provider];
      if (!provider.listSubCalendars) return [];

      const raw = await provider.listSubCalendars(ctx, connection);
      return filterSubCalendars(raw);
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
