import type { IncomingEvent, SyncWindow } from "@shared/calendars";
import * as Calendar from "expo-calendar";

// Inclusive last day for an exclusive-end UTC ms boundary. expo-calendar gives
// all-day events as UTC-midnight → next-UTC-midnight; we want the date string
// of the final day the event occupies.
function utcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function previousUtcDateKey(ms: number): string {
  return utcDateKey(ms - 86_400_000);
}

export async function fetchNativeEvents(
  calendarIds: string[],
  window: SyncWindow,
): Promise<IncomingEvent[]> {
  const events = await Calendar.getEventsAsync(
    calendarIds,
    new Date(window.windowStartMs),
    new Date(window.windowEndMs),
  );

  console.log(
    `[fetchNativeEvents] device returned ${events.length} event(s) from ${calendarIds.length} calendar(s)`,
    events.map((e) => ({
      id: e.id,
      calendarId: e.calendarId,
      title: e.title,
      availability: e.availability,
      allDay: e.allDay,
      startDate: e.startDate,
    })),
  );

  return events
    .filter((event) => {
      const avail = event.availability as string;
      return avail !== "free" && avail !== "notBusy";
    })
    .map((event) => {
      const startsAt = new Date(event.startDate).getTime();
      const endsAt = new Date(event.endDate).getTime();
      return {
        externalId: event.id,
        subCalendarId: event.calendarId,
        title: event.title,
        description: event.notes || undefined,
        location: event.location ?? undefined,
        startsAt,
        endsAt,
        isAllDay: event.allDay,
        startDate: event.allDay ? utcDateKey(startsAt) : undefined,
        endDate: event.allDay ? previousUtcDateKey(endsAt) : undefined,
        originalTimezone: event.allDay ? undefined : event.timeZone || undefined,
      };
    });
}
