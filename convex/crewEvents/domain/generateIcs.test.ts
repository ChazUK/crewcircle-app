import { describe, expect, test } from "vitest";

import { generateIcs } from "./generateIcs";

const BASE_EVENT = {
  uid: "abc123@crewcircle.app",
  dtstamp: Date.UTC(2026, 0, 1, 12, 0, 0),
  startsAt: Date.UTC(2026, 5, 15, 8, 0, 0),
  endsAt: Date.UTC(2026, 5, 15, 18, 0, 0),
  title: "Feature Film Shoot",
  description: "Role: Key Grip\nProduction: The Lighthouse Project",
  location: "Pinewood Studios, Buckinghamshire",
};

function parseIcsProperties(ics: string): Map<string, string> {
  const props = new Map<string, string>();
  // Unfold continuation lines (CRLF + SPACE or CRLF + TAB)
  const unfolded = ics.replace(/\r\n[ \t]/g, "");
  for (const line of unfolded.split("\r\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    props.set(line.slice(0, colon), line.slice(colon + 1));
  }
  return props;
}

describe("generateIcs", () => {
  test("produces valid RFC 5545 calendar wrapper", () => {
    const ics = generateIcs(BASE_EVENT);
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("VERSION:2.0\r\n");
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("END:VEVENT\r\n");
    expect(ics).toContain("END:VCALENDAR\r\n");
  });

  test("uses CRLF line endings throughout", () => {
    const ics = generateIcs(BASE_EVENT);
    // Every line break should be CRLF
    const linesWithLF = ics.split("\n").filter((l) => !l.endsWith("\r") && l.length > 0);
    expect(linesWithLF).toHaveLength(0);
  });

  test("includes SUMMARY from title", () => {
    const props = parseIcsProperties(generateIcs(BASE_EVENT));
    expect(props.get("SUMMARY")).toBe("Feature Film Shoot");
  });

  test("includes DTSTART in UTC format", () => {
    const props = parseIcsProperties(generateIcs(BASE_EVENT));
    expect(props.get("DTSTART")).toBe("20260615T080000Z");
  });

  test("includes DTEND in UTC format", () => {
    const props = parseIcsProperties(generateIcs(BASE_EVENT));
    expect(props.get("DTEND")).toBe("20260615T180000Z");
  });

  test("includes DESCRIPTION with escaped newlines", () => {
    const props = parseIcsProperties(generateIcs(BASE_EVENT));
    expect(props.get("DESCRIPTION")).toBe("Role: Key Grip\\nProduction: The Lighthouse Project");
  });

  test("includes LOCATION when provided", () => {
    const props = parseIcsProperties(generateIcs(BASE_EVENT));
    expect(props.get("LOCATION")).toBe("Pinewood Studios\\, Buckinghamshire");
  });

  test("omits LOCATION when not provided", () => {
    const ics = generateIcs({ ...BASE_EVENT, location: undefined });
    expect(ics).not.toContain("LOCATION:");
  });

  test("includes the provided UID unchanged", () => {
    const props = parseIcsProperties(generateIcs(BASE_EVENT));
    expect(props.get("UID")).toBe("abc123@crewcircle.app");
  });

  test("escapes backslash in text fields", () => {
    const ics = generateIcs({ ...BASE_EVENT, title: "Back\\slash" });
    const props = parseIcsProperties(ics);
    expect(props.get("SUMMARY")).toBe("Back\\\\slash");
  });

  test("escapes semicolons in text fields", () => {
    const ics = generateIcs({ ...BASE_EVENT, title: "A;B" });
    const props = parseIcsProperties(ics);
    expect(props.get("SUMMARY")).toBe("A\\;B");
  });

  test("folds lines longer than 75 octets", () => {
    const longTitle = "A".repeat(100);
    const ics = generateIcs({ ...BASE_EVENT, title: longTitle });
    for (const line of ics.split("\r\n")) {
      const bytes = new TextEncoder().encode(line);
      expect(bytes.length).toBeLessThanOrEqual(75);
    }
  });

  test("produces identical output for the same input (stable UID)", () => {
    const first = generateIcs(BASE_EVENT);
    const second = generateIcs(BASE_EVENT);
    expect(first).toBe(second);
  });
});
