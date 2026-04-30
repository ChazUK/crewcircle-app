import { RRuleTemporal } from "rrule-temporal";

export type ParsedEvent = {
  externalId: string;
  // Original VEVENT UID, shared across instances of a recurring event so
  // callers can group expanded instances back to their seed.
  uid: string;
  // Epoch ms of the recurrence-id this instance occupies. Set for every
  // expanded occurrence of an RRULE/RDATE event (including RECURRENCE-ID
  // overrides) and undefined for non-recurring events.
  recurrenceId?: number;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  // RFC 5545 "floating" time: no TZID and no Z suffix. The wall-clock value
  // is stored verbatim as if it were UTC. Clients must display UTC components
  // directly rather than converting to local time.
  isFloating: boolean;
};

export type ParseIcsOptions = {
  // Inclusive lower bound and exclusive upper bound for recurrence expansion.
  // Non-recurring events are emitted regardless of the window.
  windowStartMs?: number;
  windowEndMs?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Hard cap on how many occurrences of a single recurring event we'll emit.
// Stops a malicious or misconfigured "FREQ=SECONDLY" rule from exploding.
const MAX_OCCURRENCES_PER_RULE = 5_000;

type RawDate = { ms: number; isAllDay: boolean; raw: string; isFloating?: boolean };

type RawVEvent = {
  uid?: string;
  title?: string;
  description?: string;
  location?: string;
  dtstart?: RawDate;
  dtend?: { ms: number; isAllDay: boolean };
  recurrenceId?: { ms: number };
  rruleLine?: string;
  rdateLines: string[];
  exdateLines: string[];
  transparent?: boolean;
};

// VEVENT extractor for iCalendar (RFC 5545) feeds.
// - Unfolds continuation lines (leading space/tab).
// - Parses DTSTART/DTEND in UTC (Z suffix), with TZID parameter, floating
//   local, or date-only form.
// - Expands RRULE/RDATE within the supplied sync window (rrule-temporal),
//   honoring EXDATE exclusions and RECURRENCE-ID overrides.
// - iCalendar names are case-insensitive per RFC 5545 §3.1, so we normalize
//   names and BEGIN/END markers to uppercase before matching.
export function parseIcs(raw: string, options: ParseIcsOptions = {}): ParsedEvent[] {
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const rawEvents = collectVEvents(lines);
  const grouped = groupByUid(rawEvents);

  const events: ParsedEvent[] = [];
  for (const group of grouped) {
    pushGroup(events, group, options);
  }
  return events;
}

function collectVEvents(lines: string[]): RawVEvent[] {
  const out: RawVEvent[] = [];
  let current: RawVEvent | null = null;

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    if (upperLine === "BEGIN:VEVENT") {
      current = { rdateLines: [], exdateLines: [] };
      continue;
    }
    if (upperLine === "END:VEVENT") {
      if (current) out.push(current);
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
    const params = parseParams(parts.slice(1));

    switch (name) {
      case "UID":
        current.uid = value;
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
          current.dtstart = {
            ms: parsed.ms,
            isAllDay: parsed.isDateOnly,
            raw: line,
            isFloating: parsed.isFloating,
          };
        }
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDate(value, params);
        if (parsed) {
          current.dtend = { ms: parsed.ms, isAllDay: parsed.isDateOnly };
        }
        break;
      }
      case "RECURRENCE-ID": {
        const parsed = parseIcsDate(value, params);
        if (parsed) current.recurrenceId = { ms: parsed.ms };
        break;
      }
      case "RRULE":
        // Re-emit with the canonical "RRULE:" prefix; rrule-temporal expects
        // the property name as part of the snippet it parses.
        current.rruleLine = `RRULE:${value}`;
        break;
      case "RDATE":
        current.rdateLines.push(line);
        break;
      case "EXDATE":
        current.exdateLines.push(line);
        break;
      case "TRANSP":
        current.transparent = value.toUpperCase() === "TRANSPARENT";
        break;
      default:
        break;
    }
  }
  return out;
}

function parseParams(rawParams: string[]): Map<string, string> {
  const params = new Map<string, string>();
  for (const part of rawParams) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).toUpperCase();
    // RFC 5545 §3.1.1 permits DQUOTE around param values, and some
    // producers (Outlook exports, Microsoft ICS, etc.) prefix TZIDs with
    // a leading `/`. Strip both so lookups into the IANA database match.
    let v = part.slice(eq + 1);
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1);
    }
    if (v.startsWith("/")) v = v.slice(1);
    params.set(k, v);
  }
  return params;
}

type Group = { uid: string; base?: RawVEvent; overrides: RawVEvent[] };

function groupByUid(rawEvents: RawVEvent[]): Group[] {
  const map = new Map<string, Group>();
  for (const ev of rawEvents) {
    if (!ev.uid) continue;
    let group = map.get(ev.uid);
    if (!group) {
      group = { uid: ev.uid, overrides: [] };
      map.set(ev.uid, group);
    }
    if (ev.recurrenceId) {
      group.overrides.push(ev);
    } else if (!group.base) {
      group.base = ev;
    } else {
      // Multiple base events with the same UID is malformed; treat the
      // duplicate as an override at its own DTSTART so we don't lose data.
      if (ev.dtstart) {
        group.overrides.push({ ...ev, recurrenceId: { ms: ev.dtstart.ms } });
      }
    }
  }
  return [...map.values()];
}

function pushGroup(out: ParsedEvent[], group: Group, options: ParseIcsOptions) {
  const base = group.base;
  if (!base) {
    // Pure orphan overrides (no seed in this feed slice). Emit them at their
    // own DTSTART so the user still sees the moved instance.
    for (const ov of group.overrides) emitOverrideOrphan(out, group.uid, ov, options);
    return;
  }
  if (base.transparent || !base.dtstart || !base.title) return;

  const isRecurring = Boolean(base.rruleLine) || base.rdateLines.length > 0;
  if (!isRecurring) {
    // Legacy single-event path. Preserves externalId = UID so previously
    // cached rows aren't orphaned by the upgrade.
    const endsAt = resolveEndsAt(base);
    out.push({
      externalId: group.uid,
      uid: group.uid,
      title: base.title,
      description: base.description,
      location: base.location,
      startsAt: base.dtstart.ms,
      endsAt,
      isAllDay: base.dtstart.isAllDay,
      isFloating: base.dtstart.isFloating ?? false,
    });
    return;
  }

  expandRecurrence(out, group, base, options);
}

function resolveEndsAt(ev: RawVEvent): number {
  if (ev.dtend) return ev.dtend.ms;
  // RFC 5545 §3.6.1: when DTEND is absent, a DATE-valued DTSTART spans the
  // whole day, while a DATE-TIME valued DTSTART "takes up no time".
  return ev.dtstart!.ms + (ev.dtstart!.isAllDay ? DAY_MS : 0);
}

function emitOverrideOrphan(
  out: ParsedEvent[],
  uid: string,
  ov: RawVEvent,
  options: ParseIcsOptions,
) {
  if (ov.transparent || !ov.dtstart || !ov.title || !ov.recurrenceId) return;
  const startsAt = ov.dtstart.ms;
  const endsAt = resolveEndsAt(ov);
  if (!withinWindow(startsAt, endsAt, options)) return;
  out.push({
    externalId: `${uid}::${ov.recurrenceId.ms}`,
    uid,
    recurrenceId: ov.recurrenceId.ms,
    title: ov.title,
    description: ov.description,
    location: ov.location,
    startsAt,
    endsAt,
    isAllDay: ov.dtstart.isAllDay,
    isFloating: ov.dtstart.isFloating ?? false,
  });
}

function withinWindow(startsAt: number, endsAt: number, options: ParseIcsOptions): boolean {
  if (options.windowStartMs != null && endsAt <= options.windowStartMs) return false;
  if (options.windowEndMs != null && startsAt >= options.windowEndMs) return false;
  return true;
}

function expandRecurrence(
  out: ParsedEvent[],
  group: Group,
  base: RawVEvent,
  options: ParseIcsOptions,
) {
  const snippet = buildRruleSnippet(base);
  if (!snippet) return;

  // The duration carries through every instance — RFC 5545 says recurrence
  // overrides only change the dtstart (and optionally the dtend), so missing
  // dtend on an occurrence implies the same duration as the seed.
  const durationMs = (base.dtend?.ms ?? base.dtstart!.ms) - base.dtstart!.ms;
  const isAllDay = base.dtstart!.isAllDay;
  const isFloating = base.dtstart!.isFloating ?? false;

  // Window defaults: if callers don't constrain, use a sensible bounded
  // ±1 year so an unbounded RRULE doesn't run forever.
  const now = Date.now();
  const windowStart = options.windowStartMs ?? now - 365 * DAY_MS;
  const windowEnd = options.windowEndMs ?? now + 365 * DAY_MS;

  let rrule: RRuleTemporal;
  try {
    rrule = new RRuleTemporal({
      rruleString: snippet,
      maxIterations: MAX_OCCURRENCES_PER_RULE,
      includeDtstart: true,
    });
  } catch {
    // Malformed recurrence — fall back to emitting just the seed at its
    // DTSTART so the user at least sees one instance.
    if (!withinWindow(base.dtstart!.ms, base.dtstart!.ms + durationMs, options)) return;
    out.push(seedToInstance(group.uid, base, base.dtstart!.ms, durationMs, isAllDay, isFloating));
    return;
  }

  let occurrences: { ms: number }[];
  try {
    const range = rrule.between(new Date(windowStart), new Date(windowEnd), true);
    occurrences = range.map((zdt) => ({ ms: zdt.epochMilliseconds }));
  } catch {
    return;
  }

  const overridesByRecurrenceMs = new Map<number, RawVEvent>();
  for (const ov of group.overrides) {
    if (ov.recurrenceId) overridesByRecurrenceMs.set(ov.recurrenceId.ms, ov);
  }

  const consumed = new Set<number>();
  for (const occurrence of occurrences) {
    const override = overridesByRecurrenceMs.get(occurrence.ms);
    if (override) {
      consumed.add(occurrence.ms);
      if (override.transparent || !override.dtstart || !override.title) continue;
      out.push({
        externalId: `${group.uid}::${occurrence.ms}`,
        uid: group.uid,
        recurrenceId: occurrence.ms,
        title: override.title,
        description: override.description,
        location: override.location,
        startsAt: override.dtstart.ms,
        endsAt: resolveEndsAt(override),
        isAllDay: override.dtstart.isAllDay,
        isFloating: override.dtstart.isFloating ?? false,
      });
      continue;
    }
    out.push(seedToInstance(group.uid, base, occurrence.ms, durationMs, isAllDay, isFloating));
  }

  // Overrides whose recurrence-id sat outside the expanded window but whose
  // moved DTSTART falls inside it (e.g. a meeting bumped from yesterday into
  // today) still belong on the diary.
  for (const ov of group.overrides) {
    if (!ov.recurrenceId || consumed.has(ov.recurrenceId.ms)) continue;
    emitOverrideOrphan(out, group.uid, ov, options);
  }
}

function seedToInstance(
  uid: string,
  base: RawVEvent,
  startsAt: number,
  durationMs: number,
  isAllDay: boolean,
  isFloating: boolean,
): ParsedEvent {
  return {
    externalId: `${uid}::${startsAt}`,
    uid,
    recurrenceId: startsAt,
    title: base.title!,
    description: base.description,
    location: base.location,
    startsAt,
    endsAt: startsAt + durationMs,
    isAllDay,
    isFloating,
  };
}

function buildRruleSnippet(base: RawVEvent): string | null {
  if (!base.dtstart) return null;
  const lines: string[] = [base.dtstart.raw];
  if (base.rruleLine) lines.push(base.rruleLine);
  for (const r of base.rdateLines) lines.push(r);
  for (const e of base.exdateLines) lines.push(e);
  return lines.join("\n");
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
): { ms: number; isDateOnly: boolean; isFloating?: boolean } | null {
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
  // local zone. The wall-clock value is stored verbatim as UTC ms so it can
  // be round-tripped. Callers must use UTC components for display, not local.
  return {
    ms: Date.UTC(year, month - 1, day, hour, minute, second),
    isDateOnly: false,
    isFloating: true,
  };
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
  const targetWallMs = Date.UTC(year, month - 1, day, hour, minute, second);
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

  // Near DST transitions a single offset lookup is wrong by up to an hour:
  // querying the zone at our initial UTC guess returns the *old* offset, but
  // the refined instant might sit on the other side of the transition. Iterate
  // until the offset converges on itself (or we've bounced enough times that
  // we're in an ambiguous / non-existent wall-clock window, in which case the
  // last value is a stable fixed point).
  let utc = targetWallMs;
  for (let i = 0; i < 4; i++) {
    const wallMs = zoneWallClockAsUtc(dtf, utc);
    const offset = wallMs - utc;
    const next = targetWallMs - offset;
    if (next === utc) return next;
    utc = next;
  }
  return utc;
}

// Given a Date-time format bound to an IANA zone and a UTC instant, return the
// wall-clock time at that instant in the zone, serialized back into UTC ms.
function zoneWallClockAsUtc(dtf: Intl.DateTimeFormat, utcMs: number): number {
  const parts = dtf.formatToParts(new Date(utcMs));
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
  return Date.UTC(y, mo - 1, d, h, mi, s);
}
