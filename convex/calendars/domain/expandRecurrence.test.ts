import type { IncomingEvent, SyncWindow } from "@shared/calendars";
import { describe, expect, test } from "vitest";

import { expandRecurrence } from "./expandRecurrence";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

const baseEvent: IncomingEvent = {
  externalId: "event-123",
  title: "Standup",
  description: "Daily team sync",
  location: "Zoom",
  startsAt: Date.UTC(2025, 0, 6, 9, 0, 0),
  endsAt: Date.UTC(2025, 0, 6, 9, 30, 0),
  isAllDay: false,
  originalTimezone: "UTC",
};

const fourWeekWindow: SyncWindow = {
  windowStartMs: Date.UTC(2025, 0, 6, 0, 0, 0),
  windowEndMs: Date.UTC(2025, 1, 3, 0, 0, 0),
};

describe("expandRecurrence", () => {
  test("returns the original event unchanged when no rrule is present", () => {
    const result = expandRecurrence(baseEvent, fourWeekWindow);
    expect(result).toEqual([baseEvent]);
    expect(result).toHaveLength(1);
  });

  test("expands a weekly recurring event over a 4-week window into 4 instances", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=4" };
    const result = expandRecurrence(recurringEvent, fourWeekWindow);
    expect(result).toHaveLength(4);
  });

  test("each expanded instance has a unique externalId derived from the original", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=4" };
    const result = expandRecurrence(recurringEvent, fourWeekWindow);

    const externalIds = result.map((e) => e.externalId);
    const unique = new Set(externalIds);
    expect(unique.size).toBe(externalIds.length);

    for (const id of externalIds) {
      expect(id.startsWith("event-123")).toBe(true);
    }
  });

  test("each expanded instance has recurrenceId equal to its startsAt", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=4" };
    const result = expandRecurrence(recurringEvent, fourWeekWindow);

    for (const instance of result) {
      expect(instance.recurrenceId).toBe(instance.startsAt);
    }
  });

  test("excludes occurrences outside the sync window boundaries", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=10" };
    const narrowWindow: SyncWindow = {
      windowStartMs: Date.UTC(2025, 0, 13, 0, 0, 0),
      windowEndMs: Date.UTC(2025, 0, 27, 0, 0, 0),
    };

    const result = expandRecurrence(recurringEvent, narrowWindow);

    expect(result).toHaveLength(2);
    for (const instance of result) {
      expect(instance.startsAt).toBeGreaterThanOrEqual(narrowWindow.windowStartMs);
      expect(instance.startsAt).toBeLessThanOrEqual(narrowWindow.windowEndMs);
    }
  });

  test("preserves event duration across all expanded instances", () => {
    const longEvent: IncomingEvent & { rrule: string } = {
      ...baseEvent,
      startsAt: Date.UTC(2025, 0, 6, 9, 0, 0),
      endsAt: Date.UTC(2025, 0, 6, 10, 30, 0),
      rrule: "FREQ=WEEKLY;COUNT=4",
    };
    const expectedDurationMs = longEvent.endsAt - longEvent.startsAt;

    const result = expandRecurrence(longEvent, fourWeekWindow);

    expect(result).toHaveLength(4);
    for (const instance of result) {
      expect(instance.endsAt - instance.startsAt).toBe(expectedDurationMs);
    }
  });

  test("falls back to UTC and still expands when originalTimezone is an invalid IANA string", () => {
    const recurringEvent = {
      ...baseEvent,
      originalTimezone: "Eastern Standard Time", // Windows timezone name, not IANA
      rrule: "FREQ=WEEKLY;COUNT=2",
    };
    expect(() => expandRecurrence(recurringEvent, fourWeekWindow)).not.toThrow();
    expect(expandRecurrence(recurringEvent, fourWeekWindow)).toHaveLength(2);
  });

  test("does not include the rrule field on expanded instances", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=2" };
    const result = expandRecurrence(recurringEvent, fourWeekWindow);

    for (const instance of result) {
      expect("rrule" in instance).toBe(false);
    }
  });

  test("copies non-temporal fields from the seed event onto each instance", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=2" };
    const result = expandRecurrence(recurringEvent, fourWeekWindow);

    for (const instance of result) {
      expect(instance.title).toBe(baseEvent.title);
      expect(instance.description).toBe(baseEvent.description);
      expect(instance.location).toBe(baseEvent.location);
      expect(instance.isAllDay).toBe(baseEvent.isAllDay);
      expect(instance.originalTimezone).toBe(baseEvent.originalTimezone);
    }
  });

  test("produces instances spaced exactly one week apart for a weekly rule", () => {
    const recurringEvent = { ...baseEvent, rrule: "FREQ=WEEKLY;COUNT=4" };
    const result = expandRecurrence(recurringEvent, fourWeekWindow);
    const sorted = [...result].sort((a, b) => a.startsAt - b.startsAt);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].startsAt - sorted[i - 1].startsAt).toBe(WEEK_MS);
    }
  });
});
