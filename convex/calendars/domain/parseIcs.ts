export type ParsedEvent = {
  externalId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
};

// Minimal VEVENT extractor for iCalendar (RFC 5545) feeds.
// - Unfolds continuation lines (leading space/tab).
// - Parses DTSTART/DTEND in UTC (Z suffix), floating local, or date-only form.
// - Does NOT expand RRULE — recurring events appear once at their initial occurrence.
// - Ignores VTIMEZONE; floating times are treated as UTC for deterministic storage.
export function parseIcs(raw: string): ParsedEvent[] {
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedEvent[] = [];
  let current:
    | (Partial<ParsedEvent> & {
        startIsAllDay?: boolean;
        endIsAllDay?: boolean;
        endExplicit?: boolean;
      })
    | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.startsAt != null && current.externalId && current.title) {
        if (current.endsAt == null) {
          // Default end = start + 1 hour (timed) or + 1 day (all-day), per RFC 5545 §3.6.1
          current.endsAt = current.startIsAllDay
            ? current.startsAt + 24 * 60 * 60 * 1000
            : current.startsAt + 60 * 60 * 1000;
        }
        events.push({
          externalId: current.externalId,
          title: current.title,
          description: current.description,
          location: current.location,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          isAllDay: Boolean(current.startIsAllDay),
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const nameAndParams = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const [name] = nameAndParams.split(";");

    switch (name) {
      case "UID":
        current.externalId = value;
        break;
      case "SUMMARY":
        current.title = unescapeIcsText(value);
        break;
      case "DESCRIPTION":
        current.description = unescapeIcsText(value);
        break;
      case "LOCATION":
        current.location = unescapeIcsText(value);
        break;
      case "DTSTART": {
        const parsed = parseIcsDate(value, nameAndParams);
        if (parsed) {
          current.startsAt = parsed.ms;
          current.startIsAllDay = parsed.isDateOnly;
        }
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDate(value, nameAndParams);
        if (parsed) {
          current.endsAt = parsed.ms;
          current.endIsAllDay = parsed.isDateOnly;
          current.endExplicit = true;
        }
        break;
      }
      default:
        break;
    }
  }
  return events;
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(
  value: string,
  nameAndParams: string,
): { ms: number; isDateOnly: boolean } | null {
  const isDateOnly = /VALUE=DATE(?!-)/i.test(nameAndParams) || /^\d{8}$/.test(value);
  if (isDateOnly) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    if (!year || !month || !day) return null;
    return { ms: Date.UTC(year, month - 1, day), isDateOnly: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  if (z === "Z") {
    return { ms: Date.UTC(year, month - 1, day, hour, minute, second), isDateOnly: false };
  }
  // Floating time — treat as UTC for determinism. RFC 5545 would require TZID resolution.
  return { ms: Date.UTC(year, month - 1, day, hour, minute, second), isDateOnly: false };
}
