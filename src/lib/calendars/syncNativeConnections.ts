import type { Id } from "@convex/_generated/dataModel";
import type { IncomingEvent, SyncWindow } from "@shared/calendars";

import { fetchNativeEvents } from "./fetchNativeEvents";

export type NativeConnectionToSync = {
  connectionId: Id<"calendarConnections">;
  nativeCalendarIds: string[];
};

export type UploadNativeEvents = (
  connectionId: Id<"calendarConnections">,
  events: IncomingEvent[],
) => Promise<void>;

const SYNC_WINDOW_PAST_MS = 30 * 24 * 60 * 60 * 1000;
const SYNC_WINDOW_FUTURE_MS = 180 * 24 * 60 * 60 * 1000;

function currentSyncWindow(): SyncWindow {
  const now = Date.now();
  return {
    windowStartMs: now - SYNC_WINDOW_PAST_MS,
    windowEndMs: now + SYNC_WINDOW_FUTURE_MS,
  };
}

export async function syncNativeConnections(
  connections: NativeConnectionToSync[],
  uploadEvents: UploadNativeEvents,
): Promise<void> {
  const window = currentSyncWindow();
  const errors: Error[] = [];
  for (const { connectionId, nativeCalendarIds } of connections) {
    try {
      const events = await fetchNativeEvents(nativeCalendarIds, window);
      await uploadEvents(connectionId, events);
    } catch (err) {
      // Don't abort siblings on a single connection's failure — collect
      // and rethrow at the end so the caller (background-fetch) can
      // signal Failed to the OS scheduler instead of NewData.
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[syncNativeConnections] sync failed for connection", connectionId, error);
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `syncNativeConnections: ${errors.length} of ${connections.length} connection(s) failed`,
    );
  }
}
