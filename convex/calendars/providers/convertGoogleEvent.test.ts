import { describe, expect, test } from "vitest";

import { convertGoogleEvent, type GoogleApiEvent } from "./convertGoogleEvent";

const CAL_ID = "primary@example.com";

function makeEvent(overrides: Partial<GoogleApiEvent> = {}): GoogleApiEvent {
  return {
    id: "evt-123",
    status: "confirmed",
    summary: "Team Standup",
    description: "Daily sync",
    location: "Zoom",
    start: { dateTime: "2025-06-01T10:00:00Z", timeZone: "UTC" },
    end: { dateTime: "2025-06-01T10:30:00Z", timeZone: "UTC" },
    ...overrides,
  };
}

describe("convertGoogleEvent", () => {
  test("returns null for transparent events", () => {
    const result = convertGoogleEvent(makeEvent({ transparency: "transparent" }), CAL_ID);
    expect(result).toBeNull();
  });

  test("returns null for tentative events", () => {
    const result = convertGoogleEvent(makeEvent({ status: "tentative" }), CAL_ID);
    expect(result).toBeNull();
  });

  test("converts a confirmed event correctly", () => {
    const result = convertGoogleEvent(makeEvent(), CAL_ID);
    expect(result).toMatchObject({
      externalId: `${CAL_ID}::evt-123`,
      subCalendarId: CAL_ID,
      title: "Team Standup",
      description: "Daily sync",
      location: "Zoom",
      isAllDay: false,
      originalTimezone: "UTC",
      status: "confirmed",
    });
  });

  test("prefixes externalId with calendarId::", () => {
    const result = convertGoogleEvent(makeEvent({ id: "abc" }), "work@example.com");
    expect(result?.externalId).toBe("work@example.com::abc");
  });

  test("converts dateTime to UTC milliseconds", () => {
    const result = convertGoogleEvent(
      makeEvent({
        start: { dateTime: "2025-06-01T10:00:00Z" },
        end: { dateTime: "2025-06-01T10:30:00Z" },
      }),
      CAL_ID,
    );
    expect(result?.startsAt).toBe(Date.UTC(2025, 5, 1, 10, 0, 0));
    expect(result?.endsAt).toBe(Date.UTC(2025, 5, 1, 10, 30, 0));
  });

  test("handles timezone-offset dateTime correctly", () => {
    const result = convertGoogleEvent(
      makeEvent({
        start: { dateTime: "2025-06-01T12:00:00+02:00" },
        end: { dateTime: "2025-06-01T12:30:00+02:00" },
      }),
      CAL_ID,
    );
    // +02:00 means UTC is 2 hours behind, so 12:00+02:00 = 10:00 UTC
    expect(result?.startsAt).toBe(Date.UTC(2025, 5, 1, 10, 0, 0));
  });

  test("sets isAllDay=true and converts date-only events to midnight UTC", () => {
    const result = convertGoogleEvent(
      makeEvent({
        start: { date: "2025-06-01" },
        end: { date: "2025-06-02" },
      }),
      CAL_ID,
    );
    expect(result?.isAllDay).toBe(true);
    expect(result?.startsAt).toBe(Date.UTC(2025, 5, 1, 0, 0, 0));
    expect(result?.endsAt).toBe(Date.UTC(2025, 5, 2, 0, 0, 0));
  });

  test("returns cancelled event with status='cancelled'", () => {
    const result = convertGoogleEvent(makeEvent({ status: "cancelled" }), CAL_ID);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("cancelled");
    expect(result?.externalId).toBe(`${CAL_ID}::evt-123`);
    expect(result?.subCalendarId).toBe(CAL_ID);
  });

  test("falls back to empty string title when summary is missing", () => {
    const result = convertGoogleEvent(makeEvent({ summary: undefined }), CAL_ID);
    expect(result?.title).toBe("");
  });

  test("omits description and location when not present on confirmed event", () => {
    const result = convertGoogleEvent(
      makeEvent({ description: undefined, location: undefined }),
      CAL_ID,
    );
    expect(result?.description).toBeUndefined();
    expect(result?.location).toBeUndefined();
  });
});
