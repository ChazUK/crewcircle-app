import { describe, expect, test } from "vitest";

import { convertMicrosoftEvent, type MicrosoftGraphEvent } from "./convertMicrosoftEvent";

const CAL_ID = "calendar-1";

function makeEvent(overrides: Partial<MicrosoftGraphEvent> = {}): MicrosoftGraphEvent {
  return {
    id: "evt-1",
    subject: "Sync",
    showAs: "busy",
    start: { dateTime: "2025-06-01T10:00:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2025-06-01T10:30:00.0000000", timeZone: "UTC" },
    isAllDay: false,
    ...overrides,
  };
}

describe("convertMicrosoftEvent", () => {
  test("returns null when showAs is not in the busy set", () => {
    expect(convertMicrosoftEvent(makeEvent({ showAs: "free" }), CAL_ID)).toBeNull();
  });

  test("emits a cancelled stub for @removed events", () => {
    const result = convertMicrosoftEvent(
      { id: "evt-1", "@removed": { reason: "deleted" } } as MicrosoftGraphEvent,
      CAL_ID,
    );
    expect(result?.status).toBe("cancelled");
  });

  test("emits originalTimezone for timed events", () => {
    const result = convertMicrosoftEvent(
      makeEvent({ start: { dateTime: "2025-06-01T10:00:00.0000000", timeZone: "Europe/London" } }),
      CAL_ID,
    );
    expect(result?.originalTimezone).toBe("Europe/London");
    expect(result?.startDate).toBeUndefined();
    expect(result?.endDate).toBeUndefined();
  });

  test("emits startDate and inclusive endDate for single-day all-day events", () => {
    const result = convertMicrosoftEvent(
      makeEvent({
        isAllDay: true,
        start: { dateTime: "2025-06-01T00:00:00.0000000", timeZone: "UTC" },
        end: { dateTime: "2025-06-02T00:00:00.0000000", timeZone: "UTC" },
      }),
      CAL_ID,
    );
    expect(result?.startDate).toBe("2025-06-01");
    expect(result?.endDate).toBe("2025-06-01");
    expect(result?.originalTimezone).toBeUndefined();
  });

  test("emits inclusive endDate for multi-day all-day events", () => {
    const result = convertMicrosoftEvent(
      makeEvent({
        isAllDay: true,
        start: { dateTime: "2025-06-01T00:00:00.0000000", timeZone: "UTC" },
        end: { dateTime: "2025-06-04T00:00:00.0000000", timeZone: "UTC" },
      }),
      CAL_ID,
    );
    expect(result?.startDate).toBe("2025-06-01");
    expect(result?.endDate).toBe("2025-06-03");
  });
});
