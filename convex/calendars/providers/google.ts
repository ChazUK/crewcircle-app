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

import { encryptJson } from "../domain/crypto";

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
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[];
};

function throwAuthError(message: string): never {
  throw Object.assign(new Error(message), { kind: "auth" as const });
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
    throw new Error("Not implemented: Google Calendar is not yet supported");
  },
};
