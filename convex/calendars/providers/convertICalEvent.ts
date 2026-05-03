import type { IncomingEvent } from "@shared/calendars";
import ICAL from "ical.js";

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

  const startDate = event.startDate;
  const endDate = event.endDate;
  const startsAt = startDate.toUnixTime() * 1000;
  const endsAt = (endDate ?? startDate).toUnixTime() * 1000;
  const isAllDay = startDate.isDate;

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
    originalTimezone: tzid,
    rrule,
  };
}
