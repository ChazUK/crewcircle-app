import type { IncomingEvent } from "@shared/calendars";
import ICAL from "ical.js";

import { previousDay } from "./previousDay";

// Converts a single VEVENT component into an IncomingEvent.
// Returns null when the event should be dropped (TRANSP:TRANSPARENT or missing UID).
export function convertICalEvent(
  vevent: InstanceType<typeof ICAL.Component>,
  subCalendarId: string,
): IncomingEvent | null {
  const transp = vevent.getFirstPropertyValue("transp");
  if (typeof transp === "string" && transp.toUpperCase() === "TRANSPARENT") return null;

  const event = new ICAL.Event(vevent);
  const uid = event.uid;
  if (!uid) return null;

  const dtStartProp = vevent.getFirstProperty("dtstart");
  const tzid = (dtStartProp?.getParameter("tzid") as string | undefined) || undefined;

  const rruleProp = vevent.getFirstProperty("rrule");
  const rrule = rruleProp
    ? String((rruleProp.getFirstValue() as { toString(): string }).toString())
    : undefined;

  const start = event.startDate;
  const end = event.endDate;
  const startsAt = start.toUnixTime() * 1000;
  const endsAt = (end ?? start).toUnixTime() * 1000;
  const isAllDay = start.isDate;

  // VALUE=DATE bounds: DTSTART is the inclusive first day, DTEND is exclusive.
  // ical.js Time#toString() renders date-only values as "YYYY-MM-DD". When
  // DTEND is omitted ical.js mirrors DTSTART — treat that as a one-day event
  // rather than stepping back into the previous day.
  const startDate = isAllDay ? start.toString() : undefined;
  let endDate: string | undefined;
  if (isAllDay) {
    const endStr = (end ?? start).toString();
    endDate = endStr === start.toString() ? endStr : previousDay(endStr);
  }

  return {
    externalId: `${subCalendarId}::${uid}`,
    subCalendarId,
    uid,
    title: event.summary ?? "",
    description: event.description || undefined,
    location: event.location || undefined,
    startsAt,
    endsAt,
    isAllDay,
    startDate,
    endDate,
    originalTimezone: isAllDay ? undefined : tzid,
    rrule,
  };
}
