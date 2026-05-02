import type {
  CalendarConnectParams,
  CalendarProviderRegistry,
  SyncWindow,
} from "@shared/calendars";

import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { assignPaletteColour } from "../domain/assignPaletteColour";

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
          // user with a half-created connection they can't fix.
          await ctx.runMutation(internal.calendars.db.cascadeDelete.deleteConnection, {
            connectionId,
          });
          throw error;
        }
      }

      return connectionId;
    },

    async disconnect(_ctx: ActionCtx, _connectionId: Id<"calendarConnections">): Promise<void> {
      throw new Error("Not implemented: service.disconnect");
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
