import { describe, expect, test } from "vitest";

import { parseIcs } from "./parseIcs";

function buildIcs(...events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CrewCircle//Test//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function vevent(lines: Record<string, string>): string {
  return ["BEGIN:VEVENT", ...Object.entries(lines).map(([k, v]) => `${k}:${v}`), "END:VEVENT"].join(
    "\r\n",
  );
}

describe("parseIcs", () => {
  test("returns an empty list for an empty calendar", () => {
    expect(parseIcs("")).toEqual([]);
  });

  test("parses a basic UTC-timed event", () => {
    const ics = buildIcs(
      vevent({
        UID: "abc-123",
        SUMMARY: "Standup",
        DTSTART: "20260501T090000Z",
        DTEND: "20260501T093000Z",
      }),
    );
    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      externalId: "abc-123",
      title: "Standup",
      startsAt: Date.UTC(2026, 4, 1, 9, 0, 0),
      endsAt: Date.UTC(2026, 4, 1, 9, 30, 0),
      isAllDay: false,
    });
  });

  test("treats DTSTART;VALUE=DATE as all-day and spans 24 hours when DTEND absent", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:all-day",
        "SUMMARY:Holiday",
        "DTSTART;VALUE=DATE:20260715",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.isAllDay).toBe(true);
    expect(event.startsAt).toBe(Date.UTC(2026, 6, 15));
    expect(event.endsAt).toBe(Date.UTC(2026, 6, 16));
  });

  test("timed event without DTEND ends at DTSTART (RFC 5545 §3.6.1)", () => {
    const ics = buildIcs(
      vevent({
        UID: "instant",
        SUMMARY: "Reminder",
        DTSTART: "20260501T090000Z",
      }),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(event.endsAt);
  });

  test("skips VEVENTs marked TRANSP:TRANSPARENT", () => {
    const ics = buildIcs(
      vevent({
        UID: "free-time",
        SUMMARY: "Birthday",
        DTSTART: "20260501T090000Z",
        DTEND: "20260501T093000Z",
        TRANSP: "TRANSPARENT",
      }),
    );
    expect(parseIcs(ics)).toEqual([]);
  });

  test("skips VEVENTs missing required fields", () => {
    const noUid = buildIcs(
      vevent({
        SUMMARY: "Nameless",
        DTSTART: "20260501T090000Z",
      }),
    );
    const noSummary = buildIcs(
      vevent({
        UID: "no-summary",
        DTSTART: "20260501T090000Z",
      }),
    );
    const noStart = buildIcs(
      vevent({
        UID: "no-start",
        SUMMARY: "When?",
      }),
    );
    expect(parseIcs(noUid)).toEqual([]);
    expect(parseIcs(noSummary)).toEqual([]);
    expect(parseIcs(noStart)).toEqual([]);
  });

  test("unfolds continuation lines per RFC 5545 §3.1", () => {
    // RFC 5545 §3.1: the CRLF and the linear-whitespace char that starts the
    // continuation are BOTH stripped during unfolding, so producers must place
    // any desired space BEFORE the fold point.
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:folded",
      "SUMMARY:This is a summary ",
      " that continues on the next line",
      "DTSTART:20260501T090000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const [event] = parseIcs(ics);
    expect(event.title).toBe("This is a summary that continues on the next line");
  });

  test("unescapes \\n, \\,, \\; and \\\\ in text values", () => {
    const ics = buildIcs(
      vevent({
        UID: "escaped",
        SUMMARY: "Line1\\nLine2",
        DESCRIPTION: "A\\, B\\; C\\\\ D",
        LOCATION: "Plain",
        DTSTART: "20260501T090000Z",
      }),
    );
    const [event] = parseIcs(ics);
    expect(event.title).toBe("Line1\nLine2");
    expect(event.description).toBe("A, B; C\\ D");
    expect(event.location).toBe("Plain");
  });

  test("accepts lowercase property names (case-insensitive per RFC 5545 §3.1)", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "begin:VEVENT",
      "uid:lower",
      "summary:lower-case",
      "dtstart:20260501T090000Z",
      "dtend:20260501T093000Z",
      "end:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const [event] = parseIcs(ics);
    expect(event?.title).toBe("lower-case");
  });

  test("resolves TZID parameter to absolute UTC", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:tzid-ny",
        "SUMMARY:NY meeting",
        "DTSTART;TZID=America/New_York:20260501T090000",
        "DTEND;TZID=America/New_York:20260501T100000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    // 2026-05-01 is EDT (UTC-4), so 09:00 NY = 13:00 UTC
    expect(event.startsAt).toBe(Date.UTC(2026, 4, 1, 13, 0, 0));
    expect(event.endsAt).toBe(Date.UTC(2026, 4, 1, 14, 0, 0));
  });

  test("falls back to UTC when TZID is unknown", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:bad-tz",
        "SUMMARY:Weird TZ",
        "DTSTART;TZID=Not/A_Real_Zone:20260501T090000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(Date.UTC(2026, 4, 1, 9, 0, 0));
  });

  test("floating times without TZID are stored as UTC wall-clock and flagged isFloating", () => {
    const ics = buildIcs(
      vevent({
        UID: "floating",
        SUMMARY: "Floating",
        DTSTART: "20260501T090000",
        DTEND: "20260501T100000",
      }),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(Date.UTC(2026, 4, 1, 9, 0, 0));
    expect(event.endsAt).toBe(Date.UTC(2026, 4, 1, 10, 0, 0));
    expect(event.isFloating).toBe(true);
  });

  test("floating event wall-clock value is recoverable via UTC components (UTC+5 scenario)", () => {
    // A floating DTSTART of "09:00" should display as 09:00 on any device,
    // including one in UTC+5. Since the wall-clock value is stored as
    // Date.UTC(..., 9, 0, 0), reading getUTCHours() always returns 9.
    const ics = buildIcs(
      vevent({
        UID: "floating-utc5",
        SUMMARY: "Morning standup",
        DTSTART: "20260501T090000",
        DTEND: "20260501T093000",
      }),
    );
    const [event] = parseIcs(ics);
    expect(event.isFloating).toBe(true);
    const startDate = new Date(event.startsAt);
    const endDate = new Date(event.endsAt);
    // UTC components reflect the original wall-clock time regardless of the
    // device's local timezone (e.g. UTC+5 would show 14:00 without this flag).
    expect(startDate.getUTCHours()).toBe(9);
    expect(startDate.getUTCMinutes()).toBe(0);
    expect(endDate.getUTCHours()).toBe(9);
    expect(endDate.getUTCMinutes()).toBe(30);
  });

  test("non-floating UTC events have isFloating false", () => {
    const ics = buildIcs(
      vevent({
        UID: "utc-event",
        SUMMARY: "UTC event",
        DTSTART: "20260501T090000Z",
        DTEND: "20260501T100000Z",
      }),
    );
    const [event] = parseIcs(ics);
    expect(event.isFloating).toBe(false);
  });

  test("TZID events have isFloating false", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:tzid-not-floating",
        "SUMMARY:NY meeting",
        "DTSTART;TZID=America/New_York:20260501T090000",
        "DTEND;TZID=America/New_York:20260501T100000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.isFloating).toBe(false);
  });

  test("malformed DTSTART values are ignored", () => {
    const ics = buildIcs(
      vevent({
        UID: "bad-date",
        SUMMARY: "Broken",
        DTSTART: "not-a-date",
      }),
    );
    expect(parseIcs(ics)).toEqual([]);
  });

  test("date-only with zero-padded nonsense is rejected", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:bad-date-only",
        "SUMMARY:Broken",
        "DTSTART;VALUE=DATE:00000000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    expect(parseIcs(ics)).toEqual([]);
  });

  test("unquotes TZID values wrapped in double quotes", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:tzid-quoted",
        "SUMMARY:Quoted TZ",
        'DTSTART;TZID="America/New_York":20260501T090000',
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(Date.UTC(2026, 4, 1, 13, 0, 0));
  });

  test("strips leading slash on TZID (Outlook-style)", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:tzid-slash",
        "SUMMARY:Outlook style",
        "DTSTART;TZID=/America/New_York:20260501T090000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(Date.UTC(2026, 4, 1, 13, 0, 0));
  });

  test("resolves wall-clock times on the DST spring-forward day correctly", () => {
    // 2026-03-08 02:00 in America/New_York does not exist (clocks jump from
    // 01:59 EST to 03:00 EDT). 03:30 EDT is 07:30 UTC.
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:spring-forward",
        "SUMMARY:Spring forward meeting",
        "DTSTART;TZID=America/New_York:20260308T033000",
        "DTEND;TZID=America/New_York:20260308T043000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(Date.UTC(2026, 2, 8, 7, 30, 0));
    expect(event.endsAt).toBe(Date.UTC(2026, 2, 8, 8, 30, 0));
  });

  test("resolves wall-clock times on the DST fall-back day correctly", () => {
    // 2026-11-01 clocks fall back from 02:00 EDT to 01:00 EST. 01:30 is
    // ambiguous; our implementation should still converge to a stable UTC
    // result (either pre- or post-transition). 10:00 AM = 15:00 UTC under EST
    // (UTC-5), which is the "after-transition" offset.
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:fall-back",
        "SUMMARY:Fall back meeting",
        "DTSTART;TZID=America/New_York:20261101T100000",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const [event] = parseIcs(ics);
    expect(event.startsAt).toBe(Date.UTC(2026, 10, 1, 15, 0, 0));
  });

  test("handles multiple VEVENTs in a single feed", () => {
    const ics = buildIcs(
      vevent({
        UID: "one",
        SUMMARY: "First",
        DTSTART: "20260501T090000Z",
        DTEND: "20260501T100000Z",
      }),
      vevent({
        UID: "two",
        SUMMARY: "Second",
        DTSTART: "20260502T090000Z",
        DTEND: "20260502T100000Z",
      }),
    );
    const events = parseIcs(ics);
    expect(events.map((e) => e.externalId)).toEqual(["one", "two"]);
  });
});

describe("parseIcs recurrence expansion", () => {
  const HOUR_MS = 60 * 60 * 1000;

  test("expands FREQ=DAILY;COUNT=3 into three instances", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:daily-3",
        "SUMMARY:Standup",
        "DTSTART:20260501T090000Z",
        "DTEND:20260501T093000Z",
        "RRULE:FREQ=DAILY;COUNT=3",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 4, 1),
      windowEndMs: Date.UTC(2026, 4, 10),
    });
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.startsAt)).toEqual([
      Date.UTC(2026, 4, 1, 9),
      Date.UTC(2026, 4, 2, 9),
      Date.UTC(2026, 4, 3, 9),
    ]);
    // Every instance carries the duration of the seed and the shared uid.
    for (const e of events) {
      expect(e.endsAt - e.startsAt).toBe(30 * 60 * 1000);
      expect(e.uid).toBe("daily-3");
      expect(e.recurrenceId).toBe(e.startsAt);
      expect(e.externalId).toBe(`daily-3::${e.startsAt}`);
    }
  });

  test("clips occurrences to the requested window", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:weekly-window",
        "SUMMARY:Weekly",
        "DTSTART:20260501T090000Z",
        "DTEND:20260501T100000Z",
        "RRULE:FREQ=WEEKLY;COUNT=10",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 4, 8),
      windowEndMs: Date.UTC(2026, 4, 22),
    });
    // Should pick up only the May 8 and May 15 occurrences (May 1 and May 22+
    // fall outside the window).
    expect(events.map((e) => e.startsAt)).toEqual([
      Date.UTC(2026, 4, 8, 9),
      Date.UTC(2026, 4, 15, 9),
    ]);
  });

  test("respects EXDATE exclusions", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:weekly-skip",
        "SUMMARY:Weekly with skip",
        "DTSTART:20260501T090000Z",
        "DTEND:20260501T100000Z",
        "RRULE:FREQ=WEEKLY;COUNT=4",
        "EXDATE:20260508T090000Z",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 4, 1),
      windowEndMs: Date.UTC(2026, 5, 1),
    });
    expect(events.map((e) => e.startsAt)).toEqual([
      Date.UTC(2026, 4, 1, 9),
      Date.UTC(2026, 4, 15, 9),
      Date.UTC(2026, 4, 22, 9),
    ]);
  });

  test("merges RDATE additions into the recurrence set", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:weekly-plus",
        "SUMMARY:Weekly + extra",
        "DTSTART:20260501T090000Z",
        "DTEND:20260501T100000Z",
        "RRULE:FREQ=WEEKLY;UNTIL=20260509T000000Z",
        "RDATE:20260520T090000Z",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 4, 1),
      windowEndMs: Date.UTC(2026, 5, 1),
    });
    expect(events.map((e) => e.startsAt).sort()).toEqual([
      Date.UTC(2026, 4, 1, 9),
      Date.UTC(2026, 4, 8, 9),
      Date.UTC(2026, 4, 20, 9),
    ]);
  });

  test("applies RECURRENCE-ID overrides at the matching occurrence", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:weekly-override",
        "SUMMARY:Weekly base",
        "DTSTART:20260501T090000Z",
        "DTEND:20260501T100000Z",
        "RRULE:FREQ=WEEKLY;COUNT=3",
        "END:VEVENT",
      ].join("\r\n"),
      [
        "BEGIN:VEVENT",
        "UID:weekly-override",
        "SUMMARY:Moved meeting",
        "RECURRENCE-ID:20260508T090000Z",
        "DTSTART:20260508T140000Z",
        "DTEND:20260508T150000Z",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 4, 1),
      windowEndMs: Date.UTC(2026, 4, 22),
    });
    expect(events).toHaveLength(3);
    const overridden = events.find((e) => e.recurrenceId === Date.UTC(2026, 4, 8, 9));
    expect(overridden?.title).toBe("Moved meeting");
    expect(overridden?.startsAt).toBe(Date.UTC(2026, 4, 8, 14));
    expect(overridden?.endsAt).toBe(Date.UTC(2026, 4, 8, 15));
    // Other occurrences keep the seed's title and time of day.
    const others = events.filter((e) => e.recurrenceId !== Date.UTC(2026, 4, 8, 9));
    for (const e of others) {
      expect(e.title).toBe("Weekly base");
      expect(e.endsAt - e.startsAt).toBe(HOUR_MS);
    }
  });

  test("emits orphan RECURRENCE-ID overrides when the seed is outside the window", () => {
    // The seed runs daily forever, but only one override falls inside the
    // window — its moved DTSTART should still appear on the diary.
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:orphan-override",
        "SUMMARY:Moved out of window",
        "RECURRENCE-ID:20260101T090000Z",
        "DTSTART:20260615T090000Z",
        "DTEND:20260615T100000Z",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 5, 1),
      windowEndMs: Date.UTC(2026, 6, 1),
    });
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Moved out of window");
    expect(events[0].startsAt).toBe(Date.UTC(2026, 5, 15, 9));
    expect(events[0].externalId).toBe(`orphan-override::${Date.UTC(2026, 0, 1, 9)}`);
  });

  test("non-recurring events keep the legacy externalId = UID and no recurrenceId", () => {
    const ics = buildIcs(
      vevent({
        UID: "single",
        SUMMARY: "Single",
        DTSTART: "20260501T090000Z",
        DTEND: "20260501T100000Z",
      }),
    );
    const [event] = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 0, 1),
      windowEndMs: Date.UTC(2027, 0, 1),
    });
    expect(event.externalId).toBe("single");
    expect(event.uid).toBe("single");
    expect(event.recurrenceId).toBeUndefined();
  });

  test("expands TZID recurrences across DST transitions in wall-clock time", () => {
    // 09:00 America/New_York is 13:00 UTC during EDT and 14:00 UTC during EST.
    // Spans the 2026-11-01 fall-back transition.
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:dst-recurring",
        "SUMMARY:Wall clock anchor",
        "DTSTART;TZID=America/New_York:20261030T090000",
        "DTEND;TZID=America/New_York:20261030T100000",
        "RRULE:FREQ=DAILY;COUNT=4",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcs(ics, {
      windowStartMs: Date.UTC(2026, 9, 30),
      windowEndMs: Date.UTC(2026, 10, 5),
    });
    expect(events.map((e) => e.startsAt)).toEqual([
      Date.UTC(2026, 9, 30, 13), // EDT
      Date.UTC(2026, 9, 31, 13), // EDT
      Date.UTC(2026, 10, 1, 14), // EST after fall-back
      Date.UTC(2026, 10, 2, 14), // EST
    ]);
  });

  test("does not emit a row for an iteration cap blowout (FREQ=SECONDLY)", () => {
    const ics = buildIcs(
      [
        "BEGIN:VEVENT",
        "UID:exploder",
        "SUMMARY:Bad rule",
        "DTSTART:20260501T090000Z",
        "DTEND:20260501T090030Z",
        "RRULE:FREQ=SECONDLY",
        "END:VEVENT",
      ].join("\r\n"),
    );
    const start = Date.UTC(2026, 4, 1);
    const end = Date.UTC(2026, 4, 8);
    // We don't assert the exact length here — the safety cap (5_000) keeps
    // it bounded but the precise number depends on the rrule cap behavior.
    // What matters is that the call returns and doesn't OOM the test runner.
    const events = parseIcs(ics, { windowStartMs: start, windowEndMs: end });
    expect(events.length).toBeLessThanOrEqual(5_000);
  });
});
