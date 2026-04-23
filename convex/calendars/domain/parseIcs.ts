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
// - Parses DTSTART/DTEND in UTC (Z suffix), with TZID parameter, floating
//   local, or date-only form.
// - Does NOT expand RRULE — recurring events appear once at their initial
//   occurrence.
// - iCalendar names are case-insensitive per RFC 5545 §3.1, so we normalize
//   names and BEGIN/END markers to uppercase before matching.
export function parseIcs(raw: string): ParsedEvent[] {
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedEvent[] = [];
  let current:
    | (Partial<ParsedEvent> & {
        startIsAllDay?: boolean;
        endIsAllDay?: boolean;
        endExplicit?: boolean;
        // TRANSP:TRANSPARENT marks the event as not blocking time; we drop
        // these so birthdays / "free" feed entries don't appear as busy.
        transparent?: boolean;
      })
    | null = null;

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    if (upperLine === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (upperLine === "END:VEVENT") {
      if (
        current &&
        !current.transparent &&
        current.startsAt != null &&
        current.externalId &&
        current.title
      ) {
        if (current.endsAt == null) {
          // RFC 5545 §3.6.1: when DTEND is absent, a DATE-valued DTSTART spans
          // the whole day (end = start + 24h), while a DATE-TIME valued DTSTART
          // "takes up no time" (end = start).
          current.endsAt = current.startIsAllDay
            ? current.startsAt + 24 * 60 * 60 * 1000
            : current.startsAt;
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
    const parts = nameAndParams.split(";");
    const name = parts[0].toUpperCase();
    const params = new Map<string, string>();
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf("=");
      if (eq < 0) continue;
      const k = parts[i].slice(0, eq).toUpperCase();
      const v = parts[i].slice(eq + 1);
      params.set(k, v);
    }

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
        const parsed = parseIcsDate(value, params);
        if (parsed) {
          current.startsAt = parsed.ms;
          current.startIsAllDay = parsed.isDateOnly;
        }
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDate(value, params);
        if (parsed) {
          current.endsAt = parsed.ms;
          current.endIsAllDay = parsed.isDateOnly;
          current.endExplicit = true;
        }
        break;
      }
      case "TRANSP":
        current.transparent = value.toUpperCase() === "TRANSPARENT";
        break;
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
  params: Map<string, string>,
): { ms: number; isDateOnly: boolean } | null {
  const valueType = params.get("VALUE")?.toUpperCase();
  const isDateOnly = valueType === "DATE" || /^\d{8}$/.test(value);
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
  const tzid = params.get("TZID");
  if (tzid) {
    const ms = fromWallClockInZone(year, month, day, hour, minute, second, tzid);
    if (ms != null) return { ms, isDateOnly: false };
  }
  // Floating time (no TZID, no Z) — RFC 5545 says interpret in the observer's
  // local zone. We have no "observer" server-side, so fall back to UTC for
  // deterministic storage.
  return { ms: Date.UTC(year, month - 1, day, hour, minute, second), isDateOnly: false };
}

// Convert a wall-clock timestamp in the given IANA zone to an absolute UTC
// epoch. Uses Intl.DateTimeFormat to look up the zone's offset at that instant,
// then subtracts it. Returns null if the zone identifier is unknown.
function fromWallClockInZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number | null {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  let dtf: Intl.DateTimeFormat;
  try {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }
  const parts = dtf.formatToParts(new Date(guess));
  let y = 0;
  let mo = 0;
  let d = 0;
  let h = 0;
  let mi = 0;
  let s = 0;
  for (const p of parts) {
    const val = Number(p.value);
    switch (p.type) {
      case "year":
        y = val;
        break;
      case "month":
        mo = val;
        break;
      case "day":
        d = val;
        break;
      case "hour":
        h = val === 24 ? 0 : val;
        break;
      case "minute":
        mi = val;
        break;
      case "second":
        s = val;
        break;
    }
  }
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const offset = wallAsUtc - guess;
  return guess - offset;
}
