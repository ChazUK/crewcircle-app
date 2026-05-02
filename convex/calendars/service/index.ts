import type {
  CalendarConnectParams,
  CalendarProviderRegistry,
  SubCalendar,
  SyncWindow,
} from "@shared/calendars";

import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { requireOwnedConnection } from "../auth/requireOwnedConnection";
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
        internal.calendars.domain.getConnectionColoursForUser.getConnectionColoursForUser,
        { userId: user._id },
      );
      const color = assignPaletteColour(usedColours);

      const provider = providers[params.provider];
      const result = await provider.connect(ctx, params, {
        userId: user._id,
        color,
      });

      // One atomic mutation inserts the connection and every Sub-Calendar
      // the provider's blueprint requires. Replaces the previous
      // two-mutation flow (provider wrote the connection row, service
      // wrote the sub-calendar) which could orphan an iCal connection
      // without its synthetic Sub-Calendar on partial failure.
      return ctx.runMutation(
        internal.calendars.db.insertCalendarConnection.insertCalendarConnection,
        {
          userId: user._id,
          provider: params.provider,
          label: params.label,
          color,
          blueprint: result.connection,
          subCalendars: result.subCalendars,
        },
      );
    },

    async disconnect(ctx: ActionCtx, connectionId: Id<"calendarConnections">): Promise<void> {
      await requireOwnedConnection(ctx, connectionId);
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
      const { connection } = await requireOwnedConnection(ctx, connectionId);
      const provider = providers[connection.provider];
      if (!provider.listSubCalendars) return [];
      const raw = await provider.listSubCalendars(ctx, connection);
      return filterSubCalendars(raw);
    },

    async setEnabledSubCalendars(
      ctx: ActionCtx,
      connectionId: Id<"calendarConnections">,
      selections: { externalId: string; label: string }[],
    ): Promise<void> {
      await requireOwnedConnection(ctx, connectionId);
      await ctx.runMutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
        connectionId,
        selections,
      });
    },
  };
}
