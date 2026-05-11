import type {
  CalendarConnectParams,
  CalendarProviderRegistry,
  IncomingEvent,
  SubCalendar,
  SyncWindow,
} from "@shared/calendars";

import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { requireOwnedConnection } from "../auth/requireOwnedConnection";
import { assignPaletteColour } from "../domain/assignPaletteColour";
import { expandRecurrence } from "../domain/expandRecurrence";
import { filterSubCalendars } from "../domain/filterSubCalendars";
import { syncAfterConnect } from "../syncAfterConnect";

export function currentSyncWindow(): SyncWindow {
  return {
    windowStartMs: Date.now() - 30 * 24 * 60 * 60 * 1000,
    windowEndMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
  };
}

// writeEvents' Convex validator is strict — `rrule` and `status` are
// pipeline-internal and would be rejected. Drop them here so the
// persisted shape matches the calendarEvents row exactly.
function toWriteEventsShape(event: IncomingEvent) {
  return {
    externalId: event.externalId,
    subCalendarId: event.subCalendarId,
    uid: event.uid,
    recurrenceId: event.recurrenceId,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    isAllDay: event.isAllDay,
    originalTimezone: event.originalTimezone,
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
      const connectionId: Id<"calendarConnections"> = await ctx.runMutation(
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

      // Kick off an immediate sync so the user sees their events without
      // waiting for the cron sweep. Native connections sync from the
      // device, not the server — scheduling a server-side sync there
      // would just hit the "native syncs from the device" guard and burn
      // through the retry budget.
      if (params.provider !== "native") {
        await syncAfterConnect(ctx, connectionId);
      }

      return connectionId;
    },

    async disconnect(ctx: ActionCtx, connectionId: Id<"calendarConnections">): Promise<void> {
      await requireOwnedConnection(ctx, connectionId);
      await ctx.runMutation(internal.calendars.db.cascadeDelete.deleteConnection, { connectionId });
    },

    // Inner sync pass for one Calendar Connection. Trusted internal entry
    // point — assumes the caller (cron / explicit user-initiated action)
    // has already authorised the run. Throws on any unrecoverable error;
    // the retry wrapper added in #128 catches and tracks failures.
    async sync(ctx: ActionCtx, connectionId: Id<"calendarConnections">): Promise<void> {
      const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
        internal.calendars.db.getConnectionInternal.getConnectionInternal,
        { connectionId },
      );
      if (!connection) {
        throw new Error(`Calendar Connection ${connectionId} not found`);
      }
      // Native sync runs on-device — the server has no access to the
      // device's calendar store, so a server-side sync attempt is a
      // programming error, not a transient failure.
      if (connection.provider === "native") {
        throw new Error("Native Calendar Connections sync from the device, not the server");
      }

      const provider = providers[connection.provider];
      if (!provider.fetchEvents) {
        throw new Error(`Provider ${connection.provider} does not support server-side fetch`);
      }

      const window = currentSyncWindow();
      const incoming = await provider.fetchEvents(ctx, connection, window);

      if (provider.capabilities.hasSubCalendars && provider.listSubCalendars) {
        try {
          const fresh = await provider.listSubCalendars(ctx, connection);
          await ctx.runMutation(
            internal.calendars.db.refreshSubCalendarColors.refreshSubCalendarColors,
            {
              connectionId,
              updates: fresh.map((sc) => ({ externalId: sc.id, color: sc.color })),
            },
          );
        } catch (err) {
          console.warn("[service.sync] sub-calendar colour refresh failed", err);
        }
      }

      // Hoist Sub-Calendar resolution out of the per-group loop — one
      // runQuery up front, then in-memory lookup. Sub-Calendar counts
      // per connection are small (<20), so the full collect is cheap.
      const subCalendarRows: Doc<"calendarSubCalendars">[] = await ctx.runQuery(
        internal.calendars.db.getSubCalendarsForConnection.getSubCalendarsForConnection,
        { connectionId },
      );
      const subCalendarsByExternalId = new Map(subCalendarRows.map((row) => [row.externalId, row]));

      // Cancelled events are tombstones — they should be removed from the
      // store, not expanded into recurring instances. Expand only live
      // events; carry cancellations through as-is so their externalIds
      // can drive deletedExternalIds below.
      const expanded: IncomingEvent[] = incoming.flatMap((event) =>
        event.status === "cancelled" ? [event] : expandRecurrence(event, window),
      );

      const groups = new Map<string, IncomingEvent[]>();
      for (const event of expanded) {
        const list = groups.get(event.subCalendarId);
        if (list) list.push(event);
        else groups.set(event.subCalendarId, [event]);
      }

      for (const [externalSubCalendarId, eventsInGroup] of groups) {
        // Sub-calendar not enabled for this connection — drop its events
        // silently. The user has either deselected this calendar or
        // never enabled it.
        const subCalendar = subCalendarsByExternalId.get(externalSubCalendarId);
        if (!subCalendar) continue;

        const liveEvents = eventsInGroup
          .filter((event) => event.status !== "cancelled")
          .map(toWriteEventsShape);

        // Only Google's events.list (with showDeleted=true) and
        // Microsoft delta queries return cancelled markers. iCal /
        // Native rely on writeEvents' window prune to remove deletions
        // implicitly, so omit deletedExternalIds for them.
        const deletedExternalIds =
          connection.provider === "google" || connection.provider === "microsoft"
            ? eventsInGroup
                .filter((event) => event.status === "cancelled")
                .map((event) => event.externalId)
            : undefined;

        // writeEvents is the #120 module — replaces every event for this
        // sub-calendar within the sync window (upsert + window-prune)
        // and removes anything in deletedExternalIds.
        await ctx.runMutation(internal.calendars.db.writeEvents.writeEvents, {
          connectionId,
          subCalendarId: subCalendar._id,
          syncWindow: window,
          events: liveEvents,
          deletedExternalIds,
        });
      }

      await ctx.runMutation(internal.calendars.db.markConnectionSynced.markConnectionSynced, {
        connectionId,
      });
    },

    // Returns the native calendar connections that need to be re-synced from
    // the device. The actual fetch + upload runs on the client (the server
    // has no access to the device's calendar store) — this method only
    // applies the 60-second debounce so the client doesn't repeatedly hit
    // the device store when the app is opened in quick succession.
    async syncNativeOnOpen(
      ctx: ActionCtx,
    ): Promise<{ connectionId: Id<"calendarConnections">; nativeCalendarIds: string[] }[]> {
      const connections = await ctx.runQuery(api.calendars.queries.getConnections, {});
      const now = Date.now();
      return connections
        .filter((connection) => connection.provider === "native")
        .filter(
          (connection) =>
            connection.lastSyncedAt == null || now - connection.lastSyncedAt >= 60_000,
        )
        .map((connection) => ({
          connectionId: connection._id,
          nativeCalendarIds: connection.nativeCalendarIds ?? [],
        }));
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
      selections: { externalId: string; label: string; color?: string }[],
    ): Promise<void> {
      await requireOwnedConnection(ctx, connectionId);
      await ctx.runMutation(internal.calendars.db.setEnabledSubCalendars.setEnabledSubCalendars, {
        connectionId,
        selections,
      });
    },
  };
}
