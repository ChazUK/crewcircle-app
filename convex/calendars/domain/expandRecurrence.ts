import { Temporal } from "@js-temporal/polyfill";
import type { IncomingEvent, SyncWindow } from "@shared/calendars";
import { RRuleTemporal } from "rrule-temporal";

export function expandRecurrence(
  event: IncomingEvent & { rrule?: string },
  window: SyncWindow,
): IncomingEvent[] {
  if (event.rrule === undefined) {
    return [event];
  }

  const { rrule, ...seed } = event;
  const durationMs = seed.endsAt - seed.startsAt;
  const tzid = seed.originalTimezone ?? "UTC";

  // toZonedDateTimeISO throws RangeError for non-IANA strings (e.g. Windows
  // timezone names like "Eastern Standard Time" or abbreviations like "EST").
  // Fall back to UTC so a bad TZID on one event doesn't abort all expansions.
  let dtstart: Temporal.ZonedDateTime;
  try {
    dtstart = Temporal.Instant.fromEpochMilliseconds(seed.startsAt).toZonedDateTimeISO(tzid);
  } catch {
    dtstart = Temporal.Instant.fromEpochMilliseconds(seed.startsAt).toZonedDateTimeISO("UTC");
  }

  const rule = new RRuleTemporal({ rruleString: rrule, dtstart });
  const occurrences = rule.between(
    new Date(window.windowStartMs),
    new Date(window.windowEndMs),
    true,
  );

  return occurrences.map((occurrence) => {
    const startsAt = Number(occurrence.epochMilliseconds);
    return {
      ...seed,
      externalId: `${seed.externalId}::${startsAt}`,
      recurrenceId: startsAt,
      startsAt,
      endsAt: startsAt + durationMs,
    };
  });
}
