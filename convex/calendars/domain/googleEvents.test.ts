import { describe, expect, test } from "vitest";

import {
  type GoogleEvent,
  googleEventToIncoming,
  parseGoogleDate,
  shouldSkipGoogleEvent,
} from "./googleEvents";

describe("parseGoogleDate", () => {
  test("returns null for undefined field", () => {
    expect(parseGoogleDate(undefined)).toBeNull();
  });

  test("returns null for an empty field", () => {
    expect(parseGoogleDate({})).toBeNull();
  });

  test("parses ISO date-time strings", () => {
    expect(parseGoogleDate({ dateTime: "2026-05-01T09:00:00Z" })).toBe(
      Date.UTC(2026, 4, 1, 9, 0, 0),
    );
  });

  test("parses ISO date-time strings with numeric offsets", () => {
    expect(parseGoogleDate({ dateTime: "2026-05-01T09:00:00-04:00" })).toBe(
      Date.UTC(2026, 4, 1, 13, 0, 0),
    );
  });

  test("rejects dateTime strings with no offset (would otherwise parse as local time)", () => {
    expect(parseGoogleDate({ dateTime: "2026-05-01T09:00:00" })).toBeNull();
  });

  test("returns null for an unparseable dateTime", () => {
    expect(parseGoogleDate({ dateTime: "not-a-date" })).toBeNull();
  });

  test("parses yyyy-mm-dd date-only strings as UTC midnight", () => {
    expect(parseGoogleDate({ date: "2026-07-15" })).toBe(Date.UTC(2026, 6, 15));
  });

  test("returns null for an unparseable date", () => {
    expect(parseGoogleDate({ date: "nope" })).toBeNull();
  });
});

describe("shouldSkipGoogleEvent", () => {
  test("skips cancelled events", () => {
    expect(shouldSkipGoogleEvent({ id: "1", status: "cancelled" })).toBe(true);
  });

  test("skips transparent events", () => {
    expect(shouldSkipGoogleEvent({ id: "1", transparency: "transparent" })).toBe(true);
  });

  test("skips birthday events", () => {
    expect(shouldSkipGoogleEvent({ id: "1", eventType: "birthday" })).toBe(true);
  });

  test("keeps confirmed opaque events", () => {
    expect(shouldSkipGoogleEvent({ id: "1", status: "confirmed", transparency: "opaque" })).toBe(
      false,
    );
  });

  test("keeps events with no status fields", () => {
    expect(shouldSkipGoogleEvent({ id: "1" })).toBe(false);
  });
});

describe("googleEventToIncoming", () => {
  const base: GoogleEvent = {
    id: "evt-1",
    summary: "Design review",
    start: { dateTime: "2026-05-01T09:00:00Z" },
    end: { dateTime: "2026-05-01T10:00:00Z" },
  };

  test("maps timed events with summary, start, and end", () => {
    expect(googleEventToIncoming(base, "cal-a")).toEqual({
      externalId: "cal-a::evt-1",
      subCalendarId: "cal-a",
      title: "Design review",
      description: undefined,
      location: undefined,
      startsAt: Date.UTC(2026, 4, 1, 9),
      endsAt: Date.UTC(2026, 4, 1, 10),
      isAllDay: false,
    });
  });

  test("returns null when start is missing", () => {
    const { start: _omit, ...rest } = base;
    expect(googleEventToIncoming(rest as GoogleEvent, "cal-a")).toBeNull();
  });

  test("falls back to (No title) when summary is absent", () => {
    const { summary: _omit, ...rest } = base;
    expect(googleEventToIncoming(rest as GoogleEvent, "cal-a")?.title).toBe("(No title)");
  });

  test("defaults end to +1h for timed events without end", () => {
    const { end: _omit, ...rest } = base;
    const mapped = googleEventToIncoming(rest as GoogleEvent, "cal-a");
    expect(mapped?.endsAt).toBe((mapped?.startsAt ?? 0) + 60 * 60 * 1000);
  });

  test("all-day events use yyyy-mm-dd date fields and default to +1d", () => {
    const mapped = googleEventToIncoming(
      { id: "evt-2", summary: "Holiday", start: { date: "2026-07-15" } },
      "cal-b",
    );
    expect(mapped).toMatchObject({
      externalId: "cal-b::evt-2",
      isAllDay: true,
      startsAt: Date.UTC(2026, 6, 15),
      endsAt: Date.UTC(2026, 6, 16),
    });
  });

  test("preserves description and location", () => {
    const event: GoogleEvent = {
      ...base,
      description: "Quarterly planning",
      location: "Room 1",
    };
    expect(googleEventToIncoming(event, "cal-a")).toMatchObject({
      description: "Quarterly planning",
      location: "Room 1",
    });
  });
});
