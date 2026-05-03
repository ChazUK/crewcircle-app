import type { IncomingEvent, SyncWindow } from "@shared/calendars";
import * as Calendar from "expo-calendar";

export async function fetchNativeEvents(
  calendarIds: string[],
  window: SyncWindow,
): Promise<IncomingEvent[]> {
  const events = await Calendar.getEventsAsync(
    calendarIds,
    new Date(window.windowStartMs),
    new Date(window.windowEndMs),
  );

  return events
    .filter((event) => {
      const avail = event.availability as string;
      return avail !== "free" && avail !== "notBusy";
    })
    .map((event) => ({
      externalId: event.id,
      subCalendarId: event.calendarId,
      title: event.title,
      description: event.notes || undefined,
      location: event.location ?? undefined,
      startsAt: new Date(event.startDate).getTime(),
      endsAt: new Date(event.endDate).getTime(),
      isAllDay: event.allDay,
      originalTimezone: event.timeZone || undefined,
    }));
}
