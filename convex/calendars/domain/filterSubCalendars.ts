import type { SubCalendar } from "@shared/calendars";

const EXCLUDED_ID_PATTERNS = [
  "#contacts@group.v.calendar.google.com",
  "#holiday@group.v.calendar.google.com",
] as const;

const EXCLUDED_LABEL_PATTERNS = ["birthday", "holidays in", "public holiday", "contacts"] as const;

function isExcluded(calendar: SubCalendar): boolean {
  if (EXCLUDED_ID_PATTERNS.some((pattern) => calendar.id.includes(pattern))) {
    return true;
  }
  const label = calendar.label.toLowerCase();
  return EXCLUDED_LABEL_PATTERNS.some((pattern) => label.includes(pattern));
}

export function filterSubCalendars(calendars: SubCalendar[]): SubCalendar[] {
  return calendars.filter((calendar) => !isExcluded(calendar));
}
