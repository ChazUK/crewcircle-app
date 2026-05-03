import type { SyncWindow } from "@shared/calendars";
import { describe, expect, test, vi } from "vitest";

import { fetchNativeEvents } from "./fetchNativeEvents";

vi.mock("expo-calendar", () => ({
  getEventsAsync: vi.fn(),
  Availability: {
    FREE: "free",
    BUSY: "busy",
    TENTATIVE: "tentative",
    UNAVAILABLE: "unavailable",
    NOT_SUPPORTED: "notSupported",
  },
}));

import * as Calendar from "expo-calendar";

const mockGetEventsAsync = vi.mocked(Calendar.getEventsAsync);

const WINDOW: SyncWindow = {
  windowStartMs: 1_700_000_000_000,
  windowEndMs: 1_720_000_000_000,
};

function makeDeviceEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    calendarId: "cal-1",
    title: "Shoot day",
    notes: "Rooftop location",
    location: "London Bridge",
    startDate: new Date(1_710_000_000_000).toISOString(),
    endDate: new Date(1_710_003_600_000).toISOString(),
    allDay: false,
    timeZone: "Europe/London",
    availability: "busy",
    ...overrides,
  };
}

describe("fetchNativeEvents", () => {
  test("returns an empty array when device returns no events", async () => {
    mockGetEventsAsync.mockResolvedValue([]);
    const result = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(result).toEqual([]);
  });

  test("calls getEventsAsync with the correct calendar IDs and date range", async () => {
    mockGetEventsAsync.mockResolvedValue([]);
    await fetchNativeEvents(["cal-1", "cal-2"], WINDOW);
    expect(mockGetEventsAsync).toHaveBeenCalledWith(
      ["cal-1", "cal-2"],
      new Date(WINDOW.windowStartMs),
      new Date(WINDOW.windowEndMs),
    );
  });

  test("maps a device event to the IncomingEvent shape", async () => {
    mockGetEventsAsync.mockResolvedValue([makeDeviceEvent() as never]);
    const [event] = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(event).toEqual({
      externalId: "event-1",
      subCalendarId: "cal-1",
      title: "Shoot day",
      description: "Rooftop location",
      location: "London Bridge",
      startsAt: 1_710_000_000_000,
      endsAt: 1_710_003_600_000,
      isAllDay: false,
      originalTimezone: "Europe/London",
    });
  });

  test("excludes free events", async () => {
    mockGetEventsAsync.mockResolvedValue([
      makeDeviceEvent({ id: "free-event", availability: "free" }) as never,
    ]);
    const result = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(result).toHaveLength(0);
  });

  test("excludes notBusy events", async () => {
    mockGetEventsAsync.mockResolvedValue([
      makeDeviceEvent({ id: "not-busy-event", availability: "notBusy" }) as never,
    ]);
    const result = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(result).toHaveLength(0);
  });

  test("keeps busy events", async () => {
    mockGetEventsAsync.mockResolvedValue([
      makeDeviceEvent({ id: "busy-event", availability: "busy" }) as never,
    ]);
    const result = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("busy-event");
  });

  test("keeps tentative events", async () => {
    mockGetEventsAsync.mockResolvedValue([
      makeDeviceEvent({ id: "tentative-event", availability: "tentative" }) as never,
    ]);
    const result = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(result).toHaveLength(1);
  });

  test("omits description when notes is an empty string", async () => {
    mockGetEventsAsync.mockResolvedValue([makeDeviceEvent({ notes: "" }) as never]);
    const [event] = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(event.description).toBeUndefined();
  });

  test("omits location when it is null", async () => {
    mockGetEventsAsync.mockResolvedValue([makeDeviceEvent({ location: null }) as never]);
    const [event] = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(event.location).toBeUndefined();
  });

  test("handles startDate and endDate as Date objects", async () => {
    mockGetEventsAsync.mockResolvedValue([
      makeDeviceEvent({
        startDate: new Date(1_710_000_000_000),
        endDate: new Date(1_710_003_600_000),
      }) as never,
    ]);
    const [event] = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(event.startsAt).toBe(1_710_000_000_000);
    expect(event.endsAt).toBe(1_710_003_600_000);
  });

  test("maps allDay events correctly", async () => {
    mockGetEventsAsync.mockResolvedValue([makeDeviceEvent({ allDay: true }) as never]);
    const [event] = await fetchNativeEvents(["cal-1"], WINDOW);
    expect(event.isAllDay).toBe(true);
  });

  test("uses calendarId as subCalendarId", async () => {
    mockGetEventsAsync.mockResolvedValue([
      makeDeviceEvent({ calendarId: "personal-cal" }) as never,
    ]);
    const [event] = await fetchNativeEvents(["personal-cal"], WINDOW);
    expect(event.subCalendarId).toBe("personal-cal");
  });
});
