"use node";

import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { action, internalAction } from "../_generated/server";
import { ensureAccessToken, fetchCalendarList, fetchEventsForCalendars } from "./adapters/google";
import { encryptJson, type EncryptedOAuthTokens } from "./domain/crypto";
import { currentSyncWindow } from "./orchestrator";
import { orchestrator } from "./orchestrator/registry";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/calendar.readonly openid email";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
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
      await orchestrator.syncConnection(ctx, connectionId);
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Unknown sync error";
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
      const events = await fetchEventsForCalendars(accessToken, enabledIds, currentSyncWindow());
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
