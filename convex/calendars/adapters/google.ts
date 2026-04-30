"use node";

import { randomUUID } from "node:crypto";

import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  SyncWindow,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { decryptJson, encryptJson, type EncryptedOAuthTokens } from "../domain/crypto";
import {
  type GoogleEvent,
  googleEventToIncoming,
  shouldSkipGoogleEvent,
} from "../domain/googleEvents";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type EventsListResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
};

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  selected?: boolean;
};

type CalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
};

const BIRTHDAY_PATTERN = "#contacts@group.v.calendar.google.com";
const HOLIDAY_PATTERN = "#holiday@group.v.calendar.google.com";

async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    grant_type: "refresh_token",
  });
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function ensureAccessToken(
  ctx: ActionCtx,
  connection: Doc<"calendarConnections">,
  clientId: string,
): Promise<string> {
  if (!connection.encryptedTokens) {
    throw new Error("Google connection is missing stored credentials");
  }
  const tokens = decryptJson<EncryptedOAuthTokens>(connection.encryptedTokens);
  const expiresAt = connection.tokenExpiresAt ?? 0;
  if (tokens.accessToken && expiresAt - Date.now() > 60 * 1000) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    throw new Error("Access token expired and no refresh token available; reconnect required");
  }
  const currentNonce = connection.refreshNonce;
  const refreshed = await refreshAccessToken({
    refreshToken: tokens.refreshToken,
    clientId,
  });
  const nextTokens: EncryptedOAuthTokens = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
    tokenType: refreshed.token_type ?? tokens.tokenType,
  };
  const encrypted = encryptJson(nextTokens);
  const updated: boolean = await ctx.runMutation(internal.calendars.mutations.updateTokensIfNonce, {
    connectionId: connection._id,
    expectedNonce: currentNonce,
    encryptedTokens: encrypted,
    tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
    newNonce: randomUUID(),
  });
  if (updated) {
    return refreshed.access_token;
  }
  // Another concurrent action already refreshed. Re-read the freshly stored token.
  const fresh: Doc<"calendarConnections"> | null = await ctx.runQuery(
    internal.calendars.actionHelpers.getConnectionInternal,
    { connectionId: connection._id },
  );
  if (!fresh?.encryptedTokens) {
    throw new Error("Token refresh race: re-read connection is missing credentials");
  }
  const freshTokens = decryptJson<EncryptedOAuthTokens>(fresh.encryptedTokens);
  if (!freshTokens.accessToken) {
    throw new Error("Token refresh race: re-read connection is missing access token");
  }
  return freshTokens.accessToken;
}

export async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const items: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${CALENDAR_BASE}/users/me/calendarList`);
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("minAccessRole", "owner");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google calendarList failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as CalendarListResponse;
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

// fetchCalendarListAll fetches every calendar the token can see (no minAccessRole filter),
// used for the sub-calendar picker where write-only or reader calendars are still valid choices.
async function fetchCalendarListAll(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const items: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${CALENDAR_BASE}/users/me/calendarList`);
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google calendarList failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as CalendarListResponse;
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

async function fetchEventsForCalendar(
  accessToken: string,
  calendarId: string,
  window: SyncWindow,
): Promise<IncomingEvent[]> {
  const timeMin = new Date(window.windowStartMs).toISOString();
  const timeMax = new Date(window.windowEndMs).toISOString();
  const events: IncomingEvent[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google events fetch failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as EventsListResponse;
    for (const item of data.items ?? []) {
      if (shouldSkipGoogleEvent(item)) continue;
      const parsed = googleEventToIncoming(item, calendarId);
      if (parsed === null) {
        console.warn("googleEventToIncoming returned null for event", item.id);
      } else {
        events.push(parsed);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return events;
}

export async function fetchEventsForCalendars(
  accessToken: string,
  calendarIds: string[],
  window: SyncWindow,
): Promise<IncomingEvent[]> {
  const results = await Promise.all(
    calendarIds.map((id) => fetchEventsForCalendar(accessToken, id, window)),
  );
  return results.flat();
}

export const googleCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

export const GoogleCalendarAdapter: CalendarProvider = {
  capabilities: googleCapabilities,

  async fetchEvents(ctx, connection, window): Promise<IncomingEvent[]> {
    const actionCtx = ctx as ActionCtx;
    const conn = connection as Doc<"calendarConnections">;
    const clientId = conn.oauthClientId;
    if (!clientId) {
      throw new Error(
        "Google connection is missing its original OAuth client id; please reconnect.",
      );
    }
    const enabledIds =
      conn.enabledSubCalendarIds && conn.enabledSubCalendarIds.length > 0
        ? conn.enabledSubCalendarIds
        : ["primary"];
    const accessToken = await ensureAccessToken(actionCtx, conn, clientId);
    return fetchEventsForCalendars(accessToken, enabledIds, window);
  },

  async listSubCalendars(ctx, connection): Promise<SubCalendar[]> {
    const actionCtx = ctx as ActionCtx;
    const conn = connection as Doc<"calendarConnections">;
    const clientId = conn.oauthClientId;
    if (!clientId) {
      throw new Error(
        "Google connection is missing its original OAuth client id; please reconnect.",
      );
    }
    const accessToken = await ensureAccessToken(actionCtx, conn, clientId);
    const items = await fetchCalendarListAll(accessToken);
    return items
      .filter((item) => !item.id.includes(BIRTHDAY_PATTERN) && !item.id.includes(HOLIDAY_PATTERN))
      .map((item) => ({
        id: item.id,
        label: item.summaryOverride ?? item.summary ?? item.id,
        primary: Boolean(item.primary),
        hint: item.accessRole,
      }));
  },

  async writeEvent(ctx, connection, event): Promise<WriteSuccess | WriteError> {
    const actionCtx = ctx as ActionCtx;
    const conn = connection as Doc<"calendarConnections">;
    const clientId = conn.oauthClientId;
    if (!clientId) {
      throw new Error(
        "Google connection is missing its original OAuth client id; please reconnect.",
      );
    }
    const scopes = new Set((conn.scope ?? "").split(/\s+/));
    if (
      !scopes.has("https://www.googleapis.com/auth/calendar") &&
      !scopes.has("https://www.googleapis.com/auth/calendar.events")
    ) {
      return {
        kind: "insufficient_scope",
        message:
          "Calendar write permission not granted. Please reconnect your Google account with write access.",
      };
    }
    const calendarId =
      conn.enabledSubCalendarIds && conn.enabledSubCalendarIds.length > 0
        ? conn.enabledSubCalendarIds[0]
        : "primary";
    const accessToken = await ensureAccessToken(actionCtx, conn, clientId);

    const body: Record<string, unknown> = {
      summary: event.title,
      description: event.description,
      location: event.location,
    };
    if (event.isAllDay) {
      const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
      body.start = { date: toDate(event.startsAt) };
      body.end = { date: toDate(event.endsAt) };
    } else {
      body.start = { dateTime: new Date(event.startsAt).toISOString() };
      body.end = { dateTime: new Date(event.endsAt).toISOString() };
    }

    const url = `${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { kind: "unknown", message: `Google event insert failed (${res.status}): ${text}` };
    }
    const created = (await res.json()) as { id: string };
    return { externalId: created.id };
  },
};
