import { describe, expect, test, vi } from "vitest";

import { listNativeSubCalendars } from "./listNativeSubCalendars";

vi.mock("expo-calendar", () => ({
  getCalendarsAsync: vi.fn(),
  EntityTypes: { EVENT: "event", REMINDER: "reminder" },
}));

import * as Calendar from "expo-calendar";

const mockGetCalendars = vi.mocked(Calendar.getCalendarsAsync);

describe("listNativeSubCalendars", () => {
  test("returns an empty array when device has no calendars", async () => {
    mockGetCalendars.mockResolvedValue([]);
    const result = await listNativeSubCalendars();
    expect(result).toEqual([]);
  });

  test("maps device calendars to SubCalendar shape", async () => {
    mockGetCalendars.mockResolvedValue([
      { id: "cal-1", title: "Personal", type: "local" } as never,
      { id: "cal-2", title: "Work", type: "caldav" } as never,
    ]);
    const result = await listNativeSubCalendars();
    expect(result).toEqual([
      { id: "cal-1", label: "Personal", primary: false },
      { id: "cal-2", label: "Work", primary: false },
    ]);
  });

  test("sets primary to false for every calendar", async () => {
    mockGetCalendars.mockResolvedValue([
      { id: "default", title: "Calendar", isPrimary: true } as never,
    ]);
    const result = await listNativeSubCalendars();
    expect(result[0].primary).toBe(false);
  });

  test("requests only event calendars to avoid reminders permission on iOS", async () => {
    mockGetCalendars.mockResolvedValue([]);
    await listNativeSubCalendars();
    expect(mockGetCalendars).toHaveBeenCalledWith(Calendar.EntityTypes.EVENT);
  });
});
