# Google Calendar OAuth Setup

How to create the Google OAuth client(s) that CrewCircle uses to read a user's
Google Calendar, and how to wire the values into the Expo client and Convex
deployment.

## Overview

CrewCircle uses [Google OAuth 2.0 with PKCE](https://developers.google.com/identity/protocols/oauth2/native-app)
to obtain a refresh token, which Convex stores encrypted and uses to call
the Google Calendar API server-side. There is **no** Google Cloud "service
account" or domain delegation involved — every user authorises their own
account through the standard consent screen.

Three platform-specific OAuth clients are required because Google's mobile
SDKs validate the client type per-platform:

| Platform    | OAuth client type   | Used for                                |
| ----------- | ------------------- | --------------------------------------- |
| iOS         | **iOS**             | Native flow on iPhone/iPad              |
| Android     | **Android**         | Native flow on Android                  |
| Web/Expo Go | **Web application** | Fallback (Expo Go) and dev environments |

The Convex backend completes the PKCE exchange — it accepts the auth code
from the client, swaps it for tokens at `https://oauth2.googleapis.com/token`,
fetches the user's `sub` from the userinfo endpoint, and persists the refresh
token encrypted with `CALENDAR_ENCRYPTION_KEY`.

## 1. Create the Google Cloud project

1. Go to <https://console.cloud.google.com> and create (or pick) a project.
   The project name is internal — `crewcircle-prod`, `crewcircle-dev`, etc.
2. **APIs & Services → Library** → enable **Google Calendar API**.

## 2. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**.

- User type: **External**.
- App name: `CrewCircle` (or per-environment, e.g. `CrewCircle (dev)`).
- User support email: a real address you can reply from.
- App logo, app domain, privacy policy URL, terms URL — required before
  Google will let the app leave testing mode. Until publishing, only test
  users in the "Test users" list can complete the flow.
- **Scopes** — add:
  - `openid`
  - `email`
  - `https://www.googleapis.com/auth/calendar.readonly` (sensitive scope,
    requires verification before going to production)
- **Test users** — add any developer/QA Google accounts that need to sign
  in while the app is still in "Testing" mode.

When ready to ship to non-test users, click **Publish app** and submit for
verification. Sensitive-scope verification typically takes 1–2 weeks and
requires a recorded demo plus the privacy policy explaining how calendar
data is used.

## 3. Create the OAuth clients

**APIs & Services → Credentials → Create credentials → OAuth client ID**.
Repeat three times.

### iOS client

- Application type: **iOS**.
- Bundle ID: `com.crewcircle.crewcircleapp`
  (matches `ios.bundleIdentifier` in [`app.config.ts`](../../app.config.ts)).
- Copy the **Client ID** and the **iOS URL scheme** Google shows after
  creation (it's the reverse-DNS of the client id —
  `com.googleusercontent.apps.<client-id-prefix>`).

### Android client

- Application type: **Android**.
- Package name: `com.crewcircle.crewcircleapp`.
- SHA-1 certificate fingerprint: the fingerprint of the keystore that signs
  the APK/AAB. For EAS-managed builds, grab it from
  `eas credentials -p android` once a build exists. For local dev keystores,
  `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey
-storepass android` produces it.

### Web application client

- Application type: **Web application**.
- Authorised redirect URIs (used by Expo Go and as the iOS/Android fallback
  when the platform-specific client id is missing):
  - `https://auth.expo.io/@crew-circle/crewcircle-app`
    (the Expo Go proxy — only relevant if you run the app via Expo Go;
    skip if all dev happens in dev builds.)

The Web client is the one that requires the `client_secret` server-side
when present. Set `GOOGLE_CALENDAR_CLIENT_SECRET` in Convex if the Web
client id is ever used — see step 5.

## 4. Configure the Expo client

Set these in `.env` (or EAS environment variables):

```bash
EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID=<iOS client id>.apps.googleusercontent.com
EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<iOS client id prefix>
EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID=<Android client id>.apps.googleusercontent.com
EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID=<Web client id>.apps.googleusercontent.com
```

The `EXPO_PUBLIC_CLERK_GOOGLE_*` prefix is historical — the same client ids
are used by Clerk for sign-in and by the calendar connect flow, so we
deliberately share them. See
[`src/hooks/calendars/useGoogleCalendarConnect.ts`](../../src/hooks/calendars/useGoogleCalendarConnect.ts)
for how the platform fallback chain is resolved.

`EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME` is consumed by
[`app.config.ts`](../../app.config.ts): when set, it's added to the iOS
`CFBundleURLTypes` array so the OS routes the OAuth callback back into the
app. Changing it requires a new native build (`eas build` or
`npx expo prebuild`).

## 5. Configure Convex

Set in the Convex dashboard (Settings → Environment Variables) for each
deployment (dev, preview, prod):

```bash
CALENDAR_ENCRYPTION_KEY=<32 random bytes, hex-encoded>
GOOGLE_CALENDAR_CLIENT_SECRET=<Web client secret>   # optional
```

- `CALENDAR_ENCRYPTION_KEY` — AES-256-GCM key that encrypts the per-user
  refresh tokens at rest. Generate with
  `openssl rand -hex 32`. **Rotating this invalidates every stored token**
  and forces every user to reconnect, so generate once per environment and
  treat it as long-lived.
- `GOOGLE_CALENDAR_CLIENT_SECRET` — only required if a refresh request ever
  uses the Web client id. iOS and Android client types don't issue a
  client secret, so this can be left unset for purely-mobile installs.

## 6. Smoke test

1. Build the app (`eas build --profile development --platform ios`) or run
   a dev build — Expo Go won't pick up the iOS URL scheme.
2. Open the app, tap **Connect Google Calendar** in the diary screen.
3. The system browser should open `accounts.google.com`, ask you to pick
   an account, and show consent for the three scopes listed in step 2.
4. After consent, the browser should redirect back into CrewCircle and a
   green confirmation should appear.
5. In the Convex dashboard, the `calendarConnections` table should have a
   new row with `provider: "google"`, `encryptedTokens` set, and a
   `lastSyncedAt` timestamp within a few seconds.

## Common failures

- **`redirect_uri_mismatch`** — the iOS URL scheme in
  `EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME` doesn't match what Google
  generated for the iOS client. The scheme is **case-sensitive** and must
  be the exact reverse-DNS of the client id (no `.apps.googleusercontent.com`
  suffix).
- **`access_blocked: This app's request is invalid`** — the user isn't on
  the test users list and the app hasn't been published. Add them or
  publish.
- **`invalid_grant` on refresh** — the user revoked access in their Google
  Account settings, or the refresh token expired (happens after 6 months
  of inactivity for unpublished apps). The sync action surfaces this as
  `Reconnect required`; the user must disconnect and reconnect.
- **Android build connects but production build fails** — the SHA-1 in the
  Android OAuth client matches the debug keystore, not the production
  signing key. Add both fingerprints to the same Android OAuth client.
