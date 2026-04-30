"use node";

import { randomUUID } from "node:crypto";

import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { ActionCtx, action, internalAction } from "../_generated/server";
import type { IncomingEvent } from "./db/writeEvents";
import { decryptJson, encryptJson, type EncryptedOAuthTokens } from "./domain/crypto";
import {
  type GoogleEvent,
  googleEventToIncoming,
  shouldSkipGoogleEvent,
} from "./domain/googleEvents";
import { currentSyncWindow } from "./orchestrator";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/calendar.readonly openid email";

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

async function exchangeAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
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
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

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

async function fetchUserInfo(accessToken: string): Promise<{ sub: string; email?: string }> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google userinfo failed (${res.status}): ${text}`);
  }
  return (await res.json()) as { sub: string; email?: string };
}

async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const items: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${CALENDAR_BASE}/users/me/calendarList`);
    url.searchParams.set("maxResults", "250");
    // Restrict to calendars the user owns — i.e. Google's "My Calendars"
    // section. Skips subscribed holiday calendars, shared team calendars,
    // and the read-only Birthdays system calendar.
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

async function fetchEventsForCalendar(
  accessToken: string,
  calendarId: string,
): Promise<IncomingEvent[]> {
  const { windowStartMs, windowEndMs } = currentSyncWindow();
  const timeMin = new Date(windowStartMs).toISOString();
  const timeMax = new Date(windowEndMs).toISOString();
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
      if (parsed) events.push(parsed);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return events;
}

async function fetchEventsForCalendars(
  accessToken: string,
  calendarIds: string[],
): Promise<IncomingEvent[]> {
  const results = await Promise.all(
    calendarIds.map((id) => fetchEventsForCalendar(accessToken, id)),
  );
  return results.flat();
}

async function ensureAccessToken(
  ctx: ActionCtx,
  connection: Doc<"calendarConnections">,
  clientId: string,
): Promise<string> {
  if (!connection.encryptedTokens) {
    throw new Error("Google connection is missing stored credentials");
  }
  const tokens = decryptJson<EncryptedOAuthTokens>(connection.encryptedTokens);
  const expiresAt = connection.tokenExpiresAt ?? 0;
  // Refresh if expired or within 60s of expiring
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

export const connectGoogle = action({
  args: {
    code: v.string(),
    codeVerifier: v.string(),
    clientId: v.string(),
    redirectUri: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    connectionId: Id<"calendarConnections">;
    enabledSubCalendarIds: string[];
    syncError: string | null;
  }> => {
    const user = await ctx.runQuery(api.users.queries.getCurrentUser, {});
    if (!user) throw new Error("Not authenticated");

    const token = await exchangeAuthorizationCode({
      code: args.code,
      codeVerifier: args.codeVerifier,
      clientId: args.clientId,
      redirectUri: args.redirectUri,
    });

    const userInfo = await fetchUserInfo(token.access_token);
    const tokensToStore: EncryptedOAuthTokens = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
    };
    const encryptedTokens = encryptJson(tokensToStore);

    // Resolve the "primary" alias to the concrete calendarList id (usually
    // the user's email). Storing the real id keeps it consistent with what
    // the picker later shows — otherwise the picker seed can't match and
    // the user ends up with both the alias and the real id saved.
    //
    // This lookup is best-effort: the Google events.list endpoint accepts the
    // "primary" alias directly, so if the calendarList endpoint is flaking we
    // can still connect the account and let the picker resolve the real id
    // on the next open.
    let primaryId = "primary";
    try {
      const calendarsList = await fetchCalendarList(token.access_token);
      primaryId = calendarsList.find((c) => c.primary)?.id ?? "primary";
    } catch (err) {
      console.warn(
        "Google calendarList lookup failed during connect; falling back to 'primary'",
        err,
      );
    }

    const connectionId: Id<"calendarConnections"> = await ctx.runMutation(
      internal.calendars.mutations.insertConnection,
      {
        userId: user._id,
        provider: "google",
        label: userInfo.email ?? "Google Calendar",
        externalAccountId: userInfo.sub,
        scope: token.scope ?? DEFAULT_SCOPE,
        oauthClientId: args.clientId,
        encryptedTokens,
        tokenExpiresAt: Date.now() + token.expires_in * 1000,
        enabledSubCalendarIds: [primaryId],
      },
    );

    let syncError: string | null = null;
    try {
      const events = await fetchEventsForCalendars(token.access_token, [primaryId]);
      await ctx.runMutation(internal.calendars.mutations.replaceEvents, {
        connectionId,
        userId: user._id,
        events,
      });
      await ctx.runMutation(internal.calendars.mutations.markSynced, {
        connectionId,
        error: undefined,
      });
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Unknown sync error";
      await ctx.runMutation(internal.calendars.mutations.markSynced, {
        connectionId,
        error: syncError,
      });
    }
    return { connectionId, enabledSubCalendarIds: [primaryId], syncError };
  },
});

export const listGoogleCalendars = action({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      id: string;
      label: string;
      primary: boolean;
      accessRole?: string;
      backgroundColor?: string;
    }>
  > => {
    const user = await ctx.runQuery(api.users.queries.getCurrentUser, {});
    if (!user) throw new Error("Not authenticated");
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionForOwner,
      { connectionId: args.connectionId, userId: user._id },
    );
    if (!connection) throw new Error("Calendar connection not found");
    if (connection.provider !== "google") {
      throw new Error("listGoogleCalendars only supports Google connections");
    }
    const clientId = connection.oauthClientId;
    if (!clientId) {
      throw new Error("Google connection is missing its OAuth client id; please reconnect.");
    }
    const accessToken = await ensureAccessToken(ctx, connection, clientId);
    const items = await fetchCalendarList(accessToken);
    return items.map((item) => ({
      id: item.id,
      label: item.summaryOverride ?? item.summary ?? item.id,
      primary: Boolean(item.primary),
      accessRole: item.accessRole,
      backgroundColor: item.backgroundColor,
    }));
  },
});

export const syncGoogleConnectionInternal = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<null> => {
    const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
      internal.calendars.actionHelpers.getConnectionInternal,
      { connectionId: args.connectionId },
    );
    if (!connection || connection.userId !== args.userId) {
      throw new Error("Calendar connection not found");
    }
    if (connection.provider !== "google") {
      throw new Error("syncGoogleConnectionInternal only supports Google connections");
    }
    const clientId = connection.oauthClientId;
    if (!clientId) {
      throw new Error(
        "Google connection is missing its original OAuth client id; please reconnect.",
      );
    }
    const enabledIds =
      connection.enabledSubCalendarIds && connection.enabledSubCalendarIds.length > 0
        ? connection.enabledSubCalendarIds
        : ["primary"];
    try {
      const accessToken = await ensureAccessToken(ctx, connection, clientId);
      const events = await fetchEventsForCalendars(accessToken, enabledIds);
      await ctx.runMutation(internal.calendars.mutations.replaceEvents, {
        connectionId: args.connectionId,
        userId: args.userId,
        events,
      });
      await ctx.runMutation(internal.calendars.mutations.markSynced, {
        connectionId: args.connectionId,
        error: undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await ctx.runMutation(internal.calendars.mutations.markSynced, {
        connectionId: args.connectionId,
        error: message,
      });
      throw err;
    }
    return null;
  },
});
