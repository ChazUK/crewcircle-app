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
import { convertMicrosoftEvent, type MicrosoftGraphEvent } from "./convertMicrosoftEvent";

export const microsoftCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

type MicrosoftUserInfo = {
  mail: string | null;
  userPrincipalName: string;
};

type MicrosoftCalendarItem = {
  id: string;
  name: string;
  isDefaultCalendar: boolean;
};

type MicrosoftCalendarListResponse = {
  value?: MicrosoftCalendarItem[];
  "@odata.nextLink"?: string;
};

function throwAuthError(message: string): never {
  throw Object.assign(new Error(message), { kind: "auth" as const });
}

// Ensures a valid access token is available for the given connection, refreshing
// via the Microsoft OAuth token endpoint if the current token is within 60 seconds
// of expiry. Uses a nonce-based optimistic lock to prevent concurrent refresh races.
// Microsoft is a public client — no client_secret is sent.
export async function ensureAccessToken(
  ctx: ActionCtx,
  connection: Doc<"calendarConnections">,
  clientId: string,
): Promise<string> {
  if (!connection.encryptedTokens) {
    throwAuthError("Reconnect required");
  }

  const { accessToken, refreshToken } = await decryptJson(connection.encryptedTokens);

  if (connection.tokenExpiresAt && connection.tokenExpiresAt > Date.now() + 60_000) {
    return accessToken;
  }

  if (!refreshToken) {
    throwAuthError("Reconnect required");
  }

  const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text().catch(() => String(tokenResponse.status));
    throwAuthError(`Microsoft token refresh failed (${tokenResponse.status}): ${errorText}`);
  }

  const tokenData = (await tokenResponse.json()) as MicrosoftTokenResponse;
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

export const MicrosoftCalendarProvider: CalendarProvider = {
  capabilities: microsoftCapabilities,

  async connect(
    _ctx: unknown,
    params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    if (params.provider !== "microsoft") {
      throw new Error("MicrosoftCalendarProvider.connect called with non-Microsoft params");
    }

    const { authCode, codeVerifier, clientId, redirectUri } = params;

    // 1. Exchange auth code for tokens — public client, no client secret
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: codeVerifier,
          client_id: clientId,
          redirect_uri: redirectUri,
        }).toString(),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => String(tokenResponse.status));
      throwAuthError(`Microsoft token exchange failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as MicrosoftTokenResponse;
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      scope,
      token_type: tokenType,
    } = tokenData;

    // 2. Fetch user identity from Microsoft Graph
    const meResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      throwAuthError(`Microsoft Graph /me fetch failed (${meResponse.status})`);
    }

    const meData = (await meResponse.json()) as MicrosoftUserInfo;
    const externalAccountId = meData.mail ?? meData.userPrincipalName;

    // 3. List calendars so the connection is immediately syncable — follow @odata.nextLink across pages
    const subCalendars: SubCalendarBlueprint[] = [];
    let nextUrl: string | undefined = "https://graph.microsoft.com/v1.0/me/calendars";
    while (nextUrl) {
      const calResponse: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!calResponse.ok) break;
      const calData = (await calResponse.json()) as MicrosoftCalendarListResponse;
      for (const item of calData.value ?? []) {
        subCalendars.push({
          externalId: item.id,
          label: item.name,
          showAsBusy: true,
        });
      }
      nextUrl = calData["@odata.nextLink"];
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
    window: SyncWindow,
  ): Promise<IncomingEvent[]> {
    const ctx = _ctx as ActionCtx;
    const connection = _connection as Doc<"calendarConnections">;

    if (!connection.oauthClientId) {
      throwAuthError("Reconnect required");
    }

    const subCalendars = await ctx.runQuery(
      internal.calendars.db.getSubCalendarsForConnection.getSubCalendarsForConnection,
      { connectionId: connection._id },
    );

    const accessToken = await ensureAccessToken(ctx, connection, connection.oauthClientId);
    const events: IncomingEvent[] = [];

    const startDateTime = new Date(window.windowStartMs).toISOString();
    const endDateTime = new Date(window.windowEndMs).toISOString();

    for (const subCalendar of subCalendars) {
      const calendarId = subCalendar.externalId;
      const params = new URLSearchParams({ startDateTime, endDateTime });
      let nextUrl: string | undefined =
        `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView/delta?${params.toString()}`;

      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.timezone="UTC"',
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => String(response.status));
          throw new Error(
            `Microsoft Graph calendarView/delta failed for ${calendarId} (${response.status}): ${text}`,
          );
        }

        const data = (await response.json()) as {
          value?: MicrosoftGraphEvent[];
          "@odata.nextLink"?: string;
        };

        for (const item of data.value ?? []) {
          const event = convertMicrosoftEvent(item, calendarId);
          if (event !== null) events.push(event);
        }

        nextUrl = data["@odata.nextLink"];
      }
    }

    return events;
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },
};
