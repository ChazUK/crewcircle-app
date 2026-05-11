import type { IncomingEvent } from "@shared/calendars";

import { previousDay } from "./previousDay";

export type GoogleEventDate = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

export type GoogleApiEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  transparency?: string;
  start: GoogleEventDate;
  end: GoogleEventDate;
};

function toMs(d: GoogleEventDate): number {
  const raw = d.dateTime ?? d.date;
  if (!raw) return 0;
  return new Date(raw).getTime();
}

// Converts a single Google Calendar API event into an IncomingEvent.
// Returns null when the event should be silently dropped (transparent or
// tentative). Cancelled events are included with status:"cancelled" so
// the sync pipeline can tombstone them.
export function convertGoogleEvent(
  event: GoogleApiEvent,
  calendarId: string,
): IncomingEvent | null {
  if (event.transparency === "transparent") return null;
  if (event.status === "tentative") return null;

  const externalId = `${calendarId}::${event.id}`;
  const isAllDay = event.start.date !== undefined && event.start.dateTime === undefined;
  const startDate = isAllDay ? event.start.date : undefined;
  const endDate = isAllDay && event.end.date ? previousDay(event.end.date) : undefined;

  if (event.status === "cancelled") {
    return {
      externalId,
      subCalendarId: calendarId,
      title: event.summary ?? "",
      startsAt: toMs(event.start),
      endsAt: toMs(event.end),
      isAllDay,
      startDate,
      endDate,
      status: "cancelled",
    };
  }

  return {
    externalId,
    subCalendarId: calendarId,
    title: event.summary ?? "",
    description: event.description,
    location: event.location,
    startsAt: toMs(event.start),
    endsAt: toMs(event.end),
    isAllDay,
    startDate,
    endDate,
    originalTimezone: isAllDay ? undefined : event.start.timeZone,
    status: "confirmed",
  };
}
