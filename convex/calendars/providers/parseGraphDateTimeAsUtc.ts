import { Temporal } from "@js-temporal/polyfill";

// Microsoft Graph returns dateTime as a naive ISO string (e.g. "2024-01-15T10:00:00.0000000")
// with the zone reported separately in `timeZone`. With Prefer: outlook.timezone="UTC" the
// zone is UTC, so anchor naive strings to UTC explicitly. `new Date()` would otherwise
// interpret a naive string in the runtime's local zone. Strings carrying a Z/offset are
// already absolute and parsed via Instant.
export function parseGraphDateTimeAsUtc(dateTime: string): number {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(dateTime)) {
    return Temporal.Instant.from(dateTime).epochMilliseconds;
  }
  return Temporal.PlainDateTime.from(dateTime).toZonedDateTime("UTC").epochMilliseconds;
}
