import type { IncomingEvent } from "@shared/calendars";

import { parseGraphDateTimeAsUtc } from "./parseGraphDateTimeAsUtc";

type MicrosoftEventDate = {
  dateTime: string;
  timeZone: string;
};

export type MicrosoftGraphEvent = {
  id: string;
  subject?: string;
  body?: { content?: string };
  location?: { displayName?: string };
  start?: MicrosoftEventDate;
  end?: MicrosoftEventDate;
  isAllDay?: boolean;
  showAs?: string;
  "@removed"?: unknown;
};

const KEPT_SHOW_AS = new Set(["busy", "tentative", "oof"]);

// Converts a single Microsoft Graph calendar event into an IncomingEvent.
// Returns null when the event should be dropped (showAs not in busy/tentative/oof).
// Returns a cancelled stub when the event has been deleted via delta (@removed key).
// Microsoft returns times in UTC when the Prefer: outlook.timezone="UTC" header is sent.
export function convertMicrosoftEvent(
  event: MicrosoftGraphEvent,
  calendarId: string,
): IncomingEvent | null {
  const externalId = `${calendarId}::${event.id}`;

  if ("@removed" in event) {
    return {
      externalId,
      subCalendarId: calendarId,
      title: "",
      startsAt: 0,
      endsAt: 0,
      isAllDay: false,
      status: "cancelled",
    };
  }

  if (!event.showAs || !KEPT_SHOW_AS.has(event.showAs)) {
    return null;
  }

  const startsAt = event.start?.dateTime ? parseGraphDateTimeAsUtc(event.start.dateTime) : 0;
  const endsAt = event.end?.dateTime ? parseGraphDateTimeAsUtc(event.end.dateTime) : 0;
  const isAllDay = event.isAllDay ?? false;

  return {
    externalId,
    subCalendarId: calendarId,
    title: event.subject ?? "",
    description: event.body?.content,
    location: event.location?.displayName,
    startsAt,
    endsAt,
    isAllDay,
    originalTimezone: event.start?.timeZone,
    status: "confirmed",
  };
}
