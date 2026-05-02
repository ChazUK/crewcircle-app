import type { SubCalendar } from "@shared/calendars";

const EXCLUDED_ID_PATTERNS = [
  "#contacts@group.v.calendar.google.com",
  "#holiday@group.v.calendar.google.com",
] as const;

function isExcluded(calendar: SubCalendar): boolean {
  return EXCLUDED_ID_PATTERNS.some((pattern) => calendar.id.includes(pattern));
}

export function filterSubCalendars(calendars: SubCalendar[]): SubCalendar[] {
  return calendars.filter((calendar) => !isExcluded(calendar));
}
