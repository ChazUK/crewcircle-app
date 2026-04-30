import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";

import type { Doc } from "../../_generated/dataModel";
import { assertSafeIcalUrl } from "../domain/icalUrl";
import { parseIcs } from "../domain/parseIcs";

const MAX_ICAL_REDIRECTS = 5;

// Walk redirects manually so we can re-run the SSRF hostname check on every
// Location header. With `redirect: "follow"` the runtime would happily send us
// to `169.254.169.254` or `[::ffff:127.0.0.1]` if the feed owner configures
// a 30x, bypassing the check that only looked at the initial URL.
async function fetchIcalWithSafeRedirects(initialUrl: string): Promise<Response> {
  let url = assertSafeIcalUrl(initialUrl);
  for (let hop = 0; hop <= MAX_ICAL_REDIRECTS; hop++) {
    const res = await fetch(url, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`iCal redirect ${res.status} with no Location header`);
      const resolved = new URL(location, url).toString();
      url = assertSafeIcalUrl(resolved);
      continue;
    }
    return res;
  }
  throw new Error(`iCal feed exceeded ${MAX_ICAL_REDIRECTS} redirects`);
}

export const icalCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: false,
  hasSubCalendars: false,
};

export const ICalAdapter: CalendarProvider = {
  capabilities: icalCapabilities,

  async fetchEvents(_ctx, connection, window): Promise<IncomingEvent[]> {
    const conn = connection as Doc<"calendarConnections">;
    if (!conn.icalUrl) throw new Error("iCal connection is missing its URL");
    const res = await fetchIcalWithSafeRedirects(conn.icalUrl);
    if (!res.ok) throw new Error(`Failed to fetch iCal feed (status ${res.status})`);
    const body = await res.text();
    return parseIcs(body, window) as IncomingEvent[];
  },

  async writeEvent(_ctx, _connection, _event): Promise<WriteSuccess | WriteError> {
    return { kind: "not_supported", message: "iCal feeds are read-only" };
  },

  async listSubCalendars(_ctx, _connection): Promise<SubCalendar[]> {
    return [];
  },
};
