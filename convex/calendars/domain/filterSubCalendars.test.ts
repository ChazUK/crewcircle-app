import type { SubCalendar } from "@shared/calendars";
import { describe, expect, test } from "vitest";

import { filterSubCalendars } from "./filterSubCalendars";

const workCalendar: SubCalendar = {
  id: "work@example.com",
  label: "Work",
  primary: true,
};

const personalCalendar: SubCalendar = {
  id: "personal@example.com",
  label: "Personal",
  primary: false,
};

const googleBirthdayCalendar: SubCalendar = {
  id: "addressbook#contacts@group.v.calendar.google.com",
  label: "Birthdays",
  primary: false,
};

const googleHolidayCalendar: SubCalendar = {
  id: "en.uk#holiday@group.v.calendar.google.com",
  label: "Holidays in United Kingdom",
  primary: false,
};

describe("filterSubCalendars", () => {
  test("passes through a normal Work calendar unchanged", () => {
    expect(filterSubCalendars([workCalendar])).toEqual([workCalendar]);
  });

  test("excludes Google birthday calendars by ID pattern", () => {
    const input: SubCalendar[] = [
      workCalendar,
      {
        id: "addressbook#contacts@group.v.calendar.google.com",
        label: "Some Other Label",
        primary: false,
      },
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar]);
  });

  test("excludes Google holiday calendars by ID pattern", () => {
    const input: SubCalendar[] = [
      workCalendar,
      {
        id: "en.uk#holiday@group.v.calendar.google.com",
        label: "Some Other Label",
        primary: false,
      },
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar]);
  });

  test("excludes a calendar named 'Birthdays' case-insensitively", () => {
    const input: SubCalendar[] = [
      workCalendar,
      { id: "ical-feed-1", label: "BIRTHDAYS", primary: false },
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar]);
  });

  test("excludes a calendar named 'Holidays in United Kingdom'", () => {
    const input: SubCalendar[] = [
      workCalendar,
      { id: "ical-feed-2", label: "Holidays in United Kingdom", primary: false },
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar]);
  });

  test("excludes a calendar named 'Public Holiday'", () => {
    const input: SubCalendar[] = [
      workCalendar,
      { id: "ical-feed-3", label: "Public Holiday", primary: false },
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar]);
  });

  test("excludes a calendar named 'Contacts'", () => {
    const input: SubCalendar[] = [
      workCalendar,
      { id: "ical-feed-4", label: "Contacts", primary: false },
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar]);
  });

  test("returns an empty array when given empty input", () => {
    expect(filterSubCalendars([])).toEqual([]);
  });

  test("passes through multiple non-system calendars", () => {
    const input: SubCalendar[] = [workCalendar, personalCalendar];
    expect(filterSubCalendars(input)).toEqual([workCalendar, personalCalendar]);
  });

  test("filters mixed input retaining only genuine availability calendars", () => {
    const input: SubCalendar[] = [
      workCalendar,
      googleBirthdayCalendar,
      personalCalendar,
      googleHolidayCalendar,
    ];
    expect(filterSubCalendars(input)).toEqual([workCalendar, personalCalendar]);
  });

  test("does not mutate the input array", () => {
    const input: SubCalendar[] = [workCalendar, googleBirthdayCalendar];
    const snapshot = [...input];
    filterSubCalendars(input);
    expect(input).toEqual(snapshot);
  });
});
