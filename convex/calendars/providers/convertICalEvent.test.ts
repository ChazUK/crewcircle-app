/// <reference types="vite/client" />
import ICAL from "ical.js";
import { describe, expect, test } from "vitest";

import { convertICalEvent } from "./convertICalEvent";

const SUB_CAL_ID = "default";

function parseVevent(icalText: string): InstanceType<typeof ICAL.Component> {
  const parsed = ICAL.parse(icalText);
  const comp = new ICAL.Component(parsed);
  return comp.getAllSubcomponents("vevent")[0];
}

describe("convertICalEvent", () => {
  test("maps basic VEVENT fields to IncomingEvent", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:basic@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Team meeting
DESCRIPTION:Discuss Q2 plans
LOCATION:Conference Room A
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.uid).toBe("basic@example.com");
    expect(result!.externalId).toBe("default::basic@example.com");
    expect(result!.subCalendarId).toBe("default");
    expect(result!.title).toBe("Team meeting");
    expect(result!.description).toBe("Discuss Q2 plans");
    expect(result!.location).toBe("Conference Room A");
    expect(result!.isAllDay).toBe(false);
    expect(result!.startsAt).toBe(new Date("2025-06-01T10:00:00Z").getTime());
    expect(result!.endsAt).toBe(new Date("2025-06-01T11:00:00Z").getTime());
  });

  test("returns null for TRANSPARENT events", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:transparent@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Blocked time
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`);

    expect(convertICalEvent(vevent, SUB_CAL_ID)).toBeNull();
  });

  test("returns null for lowercase transparent (case-insensitive per RFC 5545)", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:transparent-lower@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Lowercase transparent
TRANSP:transparent
END:VEVENT
END:VCALENDAR`);

    expect(convertICalEvent(vevent, SUB_CAL_ID)).toBeNull();
  });

  test("includes OPAQUE events", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:opaque@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Opaque event
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`);

    expect(convertICalEvent(vevent, SUB_CAL_ID)).not.toBeNull();
  });

  test("detects all-day events from DATE DTSTART", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:allday@example.com
DTSTART;VALUE=DATE:20250601
DTEND;VALUE=DATE:20250602
SUMMARY:All day event
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.isAllDay).toBe(true);
    expect(result!.startDate).toBe("2025-06-01");
    expect(result!.endDate).toBe("2025-06-01");
  });

  test("emits inclusive endDate for multi-day all-day events", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:multiallday@example.com
DTSTART;VALUE=DATE:20250601
DTEND;VALUE=DATE:20250604
SUMMARY:Multi day
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);
    expect(result!.startDate).toBe("2025-06-01");
    expect(result!.endDate).toBe("2025-06-03");
  });

  test("treats all-day event without DTEND as a one-day event", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:noend@example.com
DTSTART;VALUE=DATE:20250601
SUMMARY:No end
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);
    expect(result!.startDate).toBe("2025-06-01");
    expect(result!.endDate).toBe("2025-06-01");
  });

  test("does not emit startDate/endDate or TZID timezone for all-day events", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:alldaynotz@example.com
DTSTART;VALUE=DATE:20250601
DTEND;VALUE=DATE:20250602
SUMMARY:All day
END:VEVENT
END:VCALENDAR`);
    const result = convertICalEvent(vevent, SUB_CAL_ID);
    expect(result!.originalTimezone).toBeUndefined();
  });

  test("extracts TZID from DTSTART into originalTimezone", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:tz@example.com
DTSTART;TZID=America/New_York:20250601T100000
DTEND;TZID=America/New_York:20250601T110000
SUMMARY:Timezone event
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.originalTimezone).toBe("America/New_York");
  });

  test("sets rrule from RRULE property (value only, no RRULE: prefix)", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:recurring@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Weekly meeting
RRULE:FREQ=WEEKLY;COUNT=4
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.rrule).toBe("FREQ=WEEKLY;COUNT=4");
  });

  test("leaves rrule undefined when no RRULE property", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:nonrecurring@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:One-time event
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.rrule).toBeUndefined();
  });

  test("converts dates to UTC milliseconds", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:utcms@example.com
DTSTART:20250601T120000Z
DTEND:20250601T130000Z
SUMMARY:UTC test
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.startsAt).toBe(Date.UTC(2025, 5, 1, 12, 0, 0));
    expect(result!.endsAt).toBe(Date.UTC(2025, 5, 1, 13, 0, 0));
  });

  test("leaves description and location undefined when absent", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:minimal@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Minimal
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, SUB_CAL_ID);

    expect(result).not.toBeNull();
    expect(result!.description).toBeUndefined();
    expect(result!.location).toBeUndefined();
    expect(result!.originalTimezone).toBeUndefined();
  });

  test("uses provided subCalendarId for externalId prefix and subCalendarId field", () => {
    const vevent = parseVevent(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:subcal@example.com
DTSTART:20250601T100000Z
DTEND:20250601T110000Z
SUMMARY:Sub-cal test
END:VEVENT
END:VCALENDAR`);

    const result = convertICalEvent(vevent, "my-calendar");

    expect(result).not.toBeNull();
    expect(result!.subCalendarId).toBe("my-calendar");
    expect(result!.externalId).toBe("my-calendar::subcal@example.com");
  });
});
