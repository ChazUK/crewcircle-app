# Microsoft Calendar OAuth Setup

How to register the Microsoft Entra (Azure AD) app that CrewCircle uses to
read a user's Outlook / Microsoft 365 calendar, and how to wire the values
into the Expo client and Convex deployment.

## Overview

CrewCircle uses Microsoft's [OAuth 2.0 authorization code flow with PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
against the **common** endpoint, which lets both consumer (`@outlook.com`,
`@hotmail.com`) and work/school accounts sign in. The Microsoft Graph
Calendar API is the data source.

The app registration is a **public client** — no client secret. The PKCE
verifier proves possession of the code on the Convex side; Microsoft does
not issue a refresh token to a public client without `offline_access`,
which we request explicitly.

## 1. Create the app registration

1. Go to <https://entra.microsoft.com> → **Identity → Applications → App
   registrations → New registration**.
2. Name: `CrewCircle` (or per-environment).
3. Supported account types: **Accounts in any organizational directory
   (any Microsoft Entra ID tenant — multitenant) and personal Microsoft
   accounts**.
   This is the option that maps to the `common` token endpoint we hit at
   runtime; picking single-tenant or org-only here will break consumer
   sign-ins.
4. Redirect URI: leave blank for now — added in step 3.
5. Register.

Note the **Application (client) ID** shown on the overview page — this is
the `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` value.

## 2. Configure API permissions

**API permissions → Add a permission → Microsoft Graph → Delegated
permissions**. Add:

- `Calendars.Read` — read the user's calendars and events.
- `User.Read` — read the user's profile (used to derive the stable account
  id and the suggested connection label).
- `offline_access` — issue a refresh token so we can sync without
  re-prompting.
- `openid` (added automatically when `User.Read` is selected).

**Do not** click "Grant admin consent" unless this is a tenant-specific
deployment — for a multi-tenant consumer app, each user grants consent at
sign-in time.

The values requested at runtime live in
[`src/hooks/calendars/useMicrosoftCalendarConnect.ts`](../../src/hooks/calendars/useMicrosoftCalendarConnect.ts).

## 3. Configure the redirect URI

**Authentication → Add a platform → Mobile and desktop applications**.

Add this custom-scheme redirect URI:

```
crewcircle://auth
```

This matches the `crewcircle` scheme declared in
[`app.config.ts`](../../app.config.ts) (`expo.scheme`) and the path
`auth` requested via `AuthSession.makeRedirectUri({ scheme: "crewcircle",
path: "auth" })` in the connect hook.

While you're on this page:

- Tick **Live SDK support** off (we don't use it).
- Under **Advanced settings**, ensure **Allow public client flows** is set
  to **Yes**. Without this, the token endpoint will reject our requests
  with `AADSTS7000218: The request body must contain the following
parameter: 'client_assertion' or 'client_secret'`.

## 4. Configure the Expo client

Set in `.env` (or EAS environment variables):

```bash
EXPO_PUBLIC_MICROSOFT_CLIENT_ID=<Application (client) ID from step 1>
```

Unlike Google, Microsoft only requires one client id across all platforms —
the redirect URI's custom scheme is enough to disambiguate per-device.

## 5. Configure Convex

Set in the Convex dashboard (Settings → Environment Variables) for each
deployment:

```bash
CALENDAR_ENCRYPTION_KEY=<32 random bytes, hex-encoded>
```

- `CALENDAR_ENCRYPTION_KEY` — same key used for Google (it's per
  connection, not per provider). Generate with `openssl rand -hex 32`.
  **Rotating it invalidates every stored token across providers**, so
  generate once per environment and treat as long-lived.

There is **no** server-side Microsoft client secret to set — the app
registration is a public client (see step 3).

## 6. Smoke test

1. Build the app (`eas build --profile development` or `npx expo
prebuild && npx expo run:ios|android`) — Expo Go won't pick up the
   `crewcircle://auth` callback.
2. Open the app, tap **Connect Microsoft Calendar** in the diary screen.
3. The system browser should open `login.microsoftonline.com`, prompt for
   the account, and show consent for **Read your calendars** and **Sign
   you in and read your profile** plus **Maintain access**.
4. After consent the browser redirects to `crewcircle://auth?code=…` and
   the app should show a green confirmation.
5. In the Convex dashboard, the `calendarConnections` table should have a
   new row with `provider: "microsoft"`, `encryptedTokens` set, and a
   `lastSyncedAt` timestamp within a few seconds.

## Common failures

- **`AADSTS7000218` (missing client_assertion / client_secret)** — public
  client flows aren't enabled on the app registration. Authentication →
  Advanced settings → **Allow public client flows = Yes**.
- **`AADSTS500113: No reply address is registered`** — the redirect URI
  isn't registered, or there's a trailing slash mismatch. Must be exactly
  `crewcircle://auth`.
- **`AADSTS50020: User account from identity provider 'live.com' does not
exist in tenant`** — the app registration is single-tenant. Change
  **Supported account types** to multitenant + personal in
  **Authentication → Supported account types**.
- **Sign-in succeeds but no refresh token is issued** — `offline_access`
  scope is missing from the runtime request or from the API permissions
  list. Both must include it.
- **Microsoft account is already connected** — the unique constraint is on
  `(userId, externalAccountId)` for the Microsoft provider. The user must
  disconnect the existing connection before reconnecting the same account.
