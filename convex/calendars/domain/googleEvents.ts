import type { IncomingEvent } from "../db/writeEvents";

export type GoogleEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  // "opaque" (default — blocks time as busy) or "transparent" (shows as free).
  transparency?: "opaque" | "transparent";
  // Newer classification; "birthday" specifically tags Contacts-imported
  // birthdays even when stored in the primary calendar.
  eventType?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Drop anything the user has explicitly marked as not blocking their time —
// "transparent" events (birthdays imported from contacts, "free" holidays,
// etc.) don't belong on a free/busy diary. Cancelled events are also ignored.
export function shouldSkipGoogleEvent(event: GoogleEvent): boolean {
  if (event.status === "cancelled") return true;
  if (event.transparency === "transparent") return true;
  if (event.eventType === "birthday") return true;
  return false;
}

// Matches a trailing `Z` or `±hh:mm` offset per ISO 8601. Google Calendar v3
// always emits one on `dateTime`, but Date.parse silently falls back to local
// time when it's missing — which would shift events depending on which host
// runs the action. Reject offset-less strings so a malformed response becomes
// a clear null rather than a mysterious time shift.
const ISO_OFFSET_RE = /(?:Z|[+-]\d{2}:?\d{2})$/;

export function parseGoogleDate(field?: { dateTime?: string; date?: string }): number | null {
  if (!field) return null;
  if (field.dateTime) {
    if (!ISO_OFFSET_RE.test(field.dateTime)) return null;
    const ms = Date.parse(field.dateTime);
    return Number.isFinite(ms) ? ms : null;
  }
  if (field.date) {
    const [y, m, d] = field.date.split("-").map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d);
  }
  return null;
}

export function googleEventToIncoming(
  event: GoogleEvent,
  subCalendarId: string,
): IncomingEvent | null {
  const startsAt = parseGoogleDate(event.start);
  const endsAt = parseGoogleDate(event.end);
  if (startsAt == null) return null;
  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const resolvedEnd = endsAt ?? startsAt + (isAllDay ? DAY_MS : HOUR_MS);
  return {
    externalId: `${subCalendarId}::${event.id}`,
    subCalendarId,
    title: event.summary ?? "(No title)",
    description: event.description,
    location: event.location,
    startsAt,
    endsAt: resolvedEnd,
    isAllDay,
  };
}
