import type { SubCalendar } from "@shared/calendars";
import * as Calendar from "expo-calendar";

export async function listNativeSubCalendars(): Promise<SubCalendar[]> {
  const calendars = await Calendar.getCalendarsAsync();
  return calendars.map((cal) => ({
    id: cal.id,
    label: cal.title,
    primary: false,
  }));
}
