import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useState } from "react";

import { fetchNativeEvents } from "@/lib/calendars/fetchNativeEvents";
import { reportError } from "@/lib/observability/reportError";

import type { ConnectionRow } from "../CalendarConnectionList";

const NATIVE_WINDOW_BACK_MS = 30 * 24 * 60 * 60 * 1000;
const NATIVE_WINDOW_FORWARD_MS = 180 * 24 * 60 * 60 * 1000;

export function useCalendarSync() {
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const syncNowAction = useAction(api.calendars.actions.syncNow);
  const uploadNativeEventsAction = useAction(api.calendars.uploadNativeEvents.uploadNativeEvents);

  const syncNativeConnection = async (
    connectionId: Id<"calendarConnections">,
    nativeCalendarIds: string[],
  ) => {
    setSyncingIds((prev) => new Set([...prev, connectionId]));
    try {
      const syncWindow = {
        windowStartMs: Date.now() - NATIVE_WINDOW_BACK_MS,
        windowEndMs: Date.now() + NATIVE_WINDOW_FORWARD_MS,
      };
      const events = await fetchNativeEvents(nativeCalendarIds, syncWindow);
      await uploadNativeEventsAction({ connectionId, events });
    } catch (err) {
      reportError(err, { tags: { area: "calendar.nativeSync" } });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    }
  };

  const syncConnection = async (connection: ConnectionRow) => {
    if (connection.provider === "native") {
      await syncNativeConnection(connection._id, connection.nativeCalendarIds ?? []);
      return;
    }
    setSyncingIds((prev) => new Set([...prev, connection._id]));
    try {
      await syncNowAction({ connectionId: connection._id });
    } catch (err) {
      reportError(err, { tags: { area: "calendar.sync" } });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(connection._id);
        return next;
      });
    }
  };

  return { syncingIds, syncConnection, syncNativeConnection };
}
