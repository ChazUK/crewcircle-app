"use node";

import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  SubCalendarBlueprint,
  SyncWindow,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { decryptJson, encryptJson } from "../domain/crypto";

export const googleCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
};

type GoogleCalendarListItem = {
  id: string;
  summary: string;
  summaryOverride?: string;
  primary?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[];
  nextPageToken?: string;
};

function throwAuthError(message: string): never {
  throw Object.assign(new Error(message), { kind: "auth" as const });
}

// Ensures a valid access token is available for the given connection, refreshing
// via the OAuth token endpoint if the current token is within 60 seconds of expiry.
// Uses a nonce-based optimistic lock so that two concurrent cron jobs refreshing the
// same connection do not overwrite each other — only the first writer wins; the second
// reads the freshly written token instead.
export async function ensureAccessToken(
  ctx: ActionCtx,
  connection: Doc<"calendarConnections">,
  clientId: string,
): Promise<string> {
  if (!connection.encryptedTokens) {
    throwAuthError("Reconnect required");
  }

  const { accessToken, refreshToken } = await decryptJson(connection.encryptedTokens);

  // Return existing token if more than 60 seconds remain before expiry.
  if (connection.tokenExpiresAt && connection.tokenExpiresAt > Date.now() + 60_000) {
    return accessToken;
  }

  if (!refreshToken) {
    throwAuthError("Reconnect required");
  }

  const tokenBody: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  };
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (clientSecret) {
    tokenBody.client_secret = clientSecret;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(tokenBody).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text().catch(() => String(tokenResponse.status));
    throwAuthError(`Google token refresh failed (${tokenResponse.status}): ${errorText}`);
  }

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
  const newAccessToken = tokenData.access_token;
  const newExpiresAt = Date.now() + tokenData.expires_in * 1000;

  const newEncryptedTokens = await encryptJson({
    accessToken: newAccessToken,
    refreshToken: tokenData.refresh_token ?? refreshToken,
    tokenType: tokenData.token_type,
  });

  const expectedNonce = connection.refreshNonce;
  const newNonce = globalThis.crypto.randomUUID();

  const wrote: boolean = await ctx.runMutation(
    internal.calendars.db.updateTokensIfNonce.updateTokensIfNonce,
    {
      connectionId: connection._id,
      expectedNonce,
      encryptedTokens: newEncryptedTokens,
      tokenExpiresAt: newExpiresAt,
      newNonce,
    },
  );

  if (!wrote) {
    // A concurrent action already refreshed. Re-read and return its token.
    const fresh = await ctx.runQuery(
      internal.calendars.db.getConnectionInternal.getConnectionInternal,
      { connectionId: connection._id },
    );
    if (!fresh?.encryptedTokens) {
      throwAuthError("Reconnect required");
    }
    const freshTokens = await decryptJson(fresh.encryptedTokens);
    return freshTokens.accessToken;
  }

  return newAccessToken;
}

export const GoogleCalendarProvider: CalendarProvider = {
  capabilities: googleCapabilities,

  async connect(
    _ctx: unknown,
    params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    if (params.provider !== "google") {
      throw new Error("GoogleCalendarProvider.connect called with non-Google params");
    }

    const { authCode, codeVerifier, clientId, redirectUri } = params;

    // 1. Exchange auth code for tokens (server-side PKCE flow)
    const tokenBody: Record<string, string> = {
      grant_type: "authorization_code",
      code: authCode,
      code_verifier: codeVerifier,
      client_id: clientId,
      redirect_uri: redirectUri,
    };
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    if (clientSecret) {
      tokenBody.client_secret = clientSecret;
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenBody).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => String(tokenResponse.status));
      throwAuthError(`Google token exchange failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      scope,
      token_type: tokenType,
    } = tokenData;

    // 2. Fetch userinfo — sub is stable Google user identifier
    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      throwAuthError(`Google userinfo fetch failed (${userInfoResponse.status})`);
    }

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
    const externalAccountId = userInfo.sub;

    // 3. List sub-calendars so the connection is immediately syncable
    const subCalendars: SubCalendarBlueprint[] = [];
    const calListResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (calListResponse.ok) {
      const calList = (await calListResponse.json()) as GoogleCalendarListResponse;
      for (const item of calList.items ?? []) {
        subCalendars.push({
          externalId: item.id,
          label: item.summary,
          showAsBusy: true,
        });
      }
    }

    // 4. Encrypt tokens — never leave the server unencrypted
    const encryptedTokens = await encryptJson({ accessToken, refreshToken, tokenType });

    return {
      connection: {
        externalAccountId,
        oauthClientId: clientId,
        encryptedTokens,
        tokenExpiresAt: Date.now() + expiresIn * 1000,
        scope,
      },
      subCalendars,
    };
  },

  async fetchEvents(
    _ctx: unknown,
    _connection: unknown,
    _window: SyncWindow,
  ): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: Google Calendar is not yet supported");
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Not implemented: Google Calendar is not yet supported");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    const ctx = _ctx as ActionCtx;
    const connection = _connection as Doc<"calendarConnections">;
    if (!connection.oauthClientId) {
      throwAuthError("Google connection missing oauthClientId");
    }

    const accessToken = await ensureAccessToken(ctx, connection, connection.oauthClientId);

    const subCalendars: SubCalendar[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throwAuthError(`Google calendarList fetch failed (${response.status})`);
      }

      const data = (await response.json()) as GoogleCalendarListResponse;
      for (const item of data.items ?? []) {
        subCalendars.push({
          id: item.id,
          label: item.summaryOverride ?? item.summary,
          primary: item.primary ?? false,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return subCalendars;
  },
};
