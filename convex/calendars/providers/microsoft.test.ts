/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import schema from "../../schema";
import { MicrosoftCalendarProvider } from "./microsoft";

const modules = import.meta.glob("/convex/**/*.ts");

// Base64-encoded 32-byte test key (all 0x01 bytes)
const TEST_KEY = btoa(String.fromCharCode(...new Array(32).fill(1)));

const FAKE_TOKEN_RESPONSE = {
  access_token: "ms-access-token",
  refresh_token: "ms-refresh-token",
  expires_in: 3600,
  scope: "Calendars.Read",
  token_type: "Bearer",
};

const FAKE_ME_RESPONSE = {
  mail: "user@example.com",
  userPrincipalName: "user@tenant.onmicrosoft.com",
};

const FAKE_CALENDARS_RESPONSE = {
  value: [
    { id: "cal-1", name: "Calendar", isDefaultCalendar: true },
    { id: "cal-2", name: "Birthdays", isDefaultCalendar: false },
  ],
};

function mockFetch(
  responses: Array<{ ok: boolean; json?: () => Promise<unknown>; text?: () => Promise<string> }>,
) {
  let callIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const resp = responses[callIndex++];
      return Promise.resolve(resp);
    }),
  );
}

describe("MicrosoftCalendarProvider.connect", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("exchanges auth code, fetches /me, lists calendars and returns encrypted result", async () => {
    const t = convexTest(schema, modules);

    mockFetch([
      { ok: true, json: async () => FAKE_TOKEN_RESPONSE },
      { ok: true, json: async () => FAKE_ME_RESPONSE },
      { ok: true, json: async () => FAKE_CALENDARS_RESPONSE },
    ]);

    const result = await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    expect(result.connection.externalAccountId).toBe("user@example.com");
    expect(result.connection.oauthClientId).toBe("client-id");
    expect(result.connection.scope).toBe("Calendars.Read");
    expect(result.connection.tokenExpiresAt).toBeGreaterThan(Date.now());
    expect(result.connection.encryptedTokens).toBeInstanceOf(ArrayBuffer);
    expect(result.subCalendars).toHaveLength(2);
    expect(result.subCalendars[0]).toMatchObject({ externalId: "cal-1", label: "Calendar" });
    expect(result.subCalendars[1]).toMatchObject({ externalId: "cal-2", label: "Birthdays" });
  });

  test("falls back to userPrincipalName when mail is null", async () => {
    const t = convexTest(schema, modules);

    mockFetch([
      { ok: true, json: async () => FAKE_TOKEN_RESPONSE },
      {
        ok: true,
        json: async () => ({ mail: null, userPrincipalName: "upn@tenant.onmicrosoft.com" }),
      },
      { ok: true, json: async () => ({ value: [] }) },
    ]);

    const result = await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    expect(result.connection.externalAccountId).toBe("upn@tenant.onmicrosoft.com");
  });

  test("throws auth SyncError when token exchange fails", async () => {
    const t = convexTest(schema, modules);

    mockFetch([{ ok: false, text: async () => "invalid_grant" }]);

    await expect(
      t.action((ctx) =>
        MicrosoftCalendarProvider.connect(
          ctx,
          {
            provider: "microsoft",
            authCode: "bad-code",
            codeVerifier: "verifier",
            clientId: "client-id",
            redirectUri: "https://app.example/callback",
            label: "Work",
          },
          { userId: "user-1", color: "#6366f1" },
        ),
      ),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  test("throws auth SyncError when /me fetch fails", async () => {
    const t = convexTest(schema, modules);

    mockFetch([
      { ok: true, json: async () => FAKE_TOKEN_RESPONSE },
      { ok: false, text: async () => "Unauthorized" },
    ]);

    await expect(
      t.action((ctx) =>
        MicrosoftCalendarProvider.connect(
          ctx,
          {
            provider: "microsoft",
            authCode: "auth-code",
            codeVerifier: "verifier",
            clientId: "client-id",
            redirectUri: "https://app.example/callback",
            label: "Work",
          },
          { userId: "user-1", color: "#6366f1" },
        ),
      ),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  test("token POST targets the Microsoft common tenant endpoint", async () => {
    const t = convexTest(schema, modules);

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      const { hostname, pathname } = new URL(url);
      if (hostname === "login.microsoftonline.com") {
        return Promise.resolve({ ok: true, json: async () => FAKE_TOKEN_RESPONSE });
      }
      if (hostname === "graph.microsoft.com" && pathname.startsWith("/v1.0/me")) {
        return Promise.resolve({ ok: true, json: async () => FAKE_ME_RESPONSE });
      }
      return Promise.resolve({ ok: true, json: async () => ({ value: [] }) });
    });
    vi.stubGlobal("fetch", fetchSpy);

    await t.action((ctx) =>
      MicrosoftCalendarProvider.connect(
        ctx,
        {
          provider: "microsoft",
          authCode: "auth-code",
          codeVerifier: "verifier",
          clientId: "client-id",
          redirectUri: "https://app.example/callback",
          label: "Work",
        },
        { userId: "user-1", color: "#6366f1" },
      ),
    );

    const tokenCall = fetchSpy.mock.calls[0];
    expect(tokenCall[0]).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
    expect(tokenCall[1].method).toBe("POST");

    const body = new URLSearchParams(tokenCall[1].body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe("verifier");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("redirect_uri")).toBe("https://app.example/callback");
    expect(body.get("client_secret")).toBeNull();
  });
});
