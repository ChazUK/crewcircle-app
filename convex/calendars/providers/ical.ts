"use node";

import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  SyncWindow,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";
import ICAL from "ical.js";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { decryptJson, encryptJson } from "../domain/crypto";
import { convertICalEvent } from "./convertICalEvent";

export const icalCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: false,
  hasSubCalendars: false,
};

// iCal feeds are opaque single-source — every event maps to one synthetic
// Sub-Calendar. The constant externalId reflects that there is no
// provider-side calendar identifier to track.
export const ICAL_SYNTHETIC_SUB_CALENDAR_EXTERNAL_ID = "default";

type FetchICalResult = { unchanged: true } | { unchanged: false; text: string };

// Fetches the raw iCal feed text for a connection.
// Decrypts the stored URL, sends conditional headers when ETag/Last-Modified
// are available, and persists new cache headers after a successful response.
// Returns { unchanged: true } on 304 — the caller must skip the sync pass entirely.
export async function fetchICalFeed(
  ctx: ActionCtx,
  connection: Doc<"calendarConnections">,
): Promise<FetchICalResult> {
  if (!connection.icalUrl) {
    throw Object.assign(new Error("iCal connection missing URL"), { kind: "network" as const });
  }

  const url = await decryptJson<string>(connection.icalUrl);

  const headers: Record<string, string> = {};
  if (connection.icalEtag) {
    headers["If-None-Match"] = connection.icalEtag;
  }
  if (connection.icalLastModified) {
    headers["If-Modified-Since"] = connection.icalLastModified;
  }

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 304) {
    return { unchanged: true };
  }

  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status}`), { kind: "network" as const });
  }

  const etag = res.headers.get("ETag") ?? undefined;
  const lastModified = res.headers.get("Last-Modified") ?? undefined;

  if (etag !== undefined || lastModified !== undefined) {
    await ctx.runMutation(internal.calendars.db.updateICalMeta.updateICalMeta, {
      connectionId: connection._id,
      icalEtag: etag,
      icalLastModified: lastModified,
    });
  }

  return { unchanged: false, text: await res.text() };
}

export const ICalProvider: CalendarProvider = {
  capabilities: icalCapabilities,

  // Returns the connection blueprint plus the synthetic Sub-Calendar
  // every iCal Calendar Connection needs. The service inserts both in a
  // single mutation, so a partially-installed iCal connection is
  // unrepresentable.
  async connect(
    _ctx: unknown,
    params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    if (params.provider !== "ical") {
      throw new Error("ICalProvider.connect called with non-iCal params");
    }
    const encryptedUrl = await encryptJson(params.url);
    return {
      connection: {
        icalUrl: encryptedUrl,
      },
      subCalendars: [
        {
          externalId: ICAL_SYNTHETIC_SUB_CALENDAR_EXTERNAL_ID,
          label: params.label,
          showAsBusy: true,
        },
      ],
    };
  },

  async fetchEvents(
    _ctx: unknown,
    _connection: unknown,
    window: SyncWindow,
  ): Promise<IncomingEvent[]> {
    const ctx = _ctx as ActionCtx;
    const connection = _connection as Doc<"calendarConnections">;

    const result = await fetchICalFeed(ctx, connection);
    if (result.unchanged) return [];

    const parsed = ICAL.parse(result.text);
    const comp = new ICAL.Component(parsed);
    const vevents = comp.getAllSubcomponents("vevent");

    const events: IncomingEvent[] = [];

    for (const vevent of vevents) {
      const event = convertICalEvent(vevent, ICAL_SYNTHETIC_SUB_CALENDAR_EXTERNAL_ID);
      if (!event) continue;

      // Non-recurring events outside the sync window are skipped.
      // Recurring events are always included — the service layer expands
      // them via expandRecurrence and filters to the window.
      if (
        !event.rrule &&
        (event.startsAt < window.windowStartMs || event.startsAt > window.windowEndMs)
      ) {
        continue;
      }

      events.push(event);
    }

    return events;
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Not implemented: iCal Calendar is not yet supported");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    throw new Error("Not implemented: iCal Calendar is not yet supported");
  },
};
