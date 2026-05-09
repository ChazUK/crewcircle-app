import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useState } from "react";

import { fetchNativeEvents } from "@/lib/calendars/fetchNativeEvents";

import type { ConnectionRow } from "../CalendarConnectionList";

const NATIVE_WINDOW_BACK_MS = 30 * 24 * 60 * 60 * 1000;
const NATIVE_WINDOW_FORWARD_MS = 180 * 24 * 60 * 60 * 1000;

export function useCalendarSync() {
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const syncNowAction = useAction(api.calendars.actions.syncNow);
  const uploadNativeEventsAction = useAction(api.calendars.uploadNativeEvents.uploadNativeEvents);

  const syncConnection = async (connection: ConnectionRow) => {
    setSyncingIds((prev) => new Set([...prev, connection._id]));
    try {
      if (connection.provider === "native") {
        const syncWindow = {
          windowStartMs: Date.now() - NATIVE_WINDOW_BACK_MS,
          windowEndMs: Date.now() + NATIVE_WINDOW_FORWARD_MS,
        };
        const events = await fetchNativeEvents(connection.nativeCalendarIds ?? [], syncWindow);
        await uploadNativeEventsAction({ connectionId: connection._id, events });
      } else {
        await syncNowAction({ connectionId: connection._id });
      }
    } catch (err) {
      console.error("[useCalendarSync] sync failed", err);
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(connection._id);
        return next;
      });
    }
  };

  return { syncingIds, syncConnection };
}
