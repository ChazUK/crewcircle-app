import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

vi.mock("../domain/crypto", () => ({
  decryptJson: vi.fn().mockResolvedValue({
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    tokenType: "Bearer",
  }),
  encryptJson: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

vi.mock("../../_generated/api", () => ({
  internal: {
    calendars: {
      db: {
        updateTokensIfNonce: {
          updateTokensIfNonce: "internal:calendars/db/updateTokensIfNonce:updateTokensIfNonce",
        },
        getConnectionInternal: {
          getConnectionInternal:
            "internal:calendars/db/getConnectionInternal:getConnectionInternal",
        },
      },
    },
  },
}));

const connectionId = "conn-1" as Id<"calendarConnections">;

function makeConnection(
  overrides: Partial<Doc<"calendarConnections">> = {},
): Doc<"calendarConnections"> {
  return {
    _id: connectionId,
    _creationTime: 0,
    userId: "user-1" as Id<"users">,
    provider: "google",
    label: "Work",
    color: "#6366f1",
    createdAt: 0,
    syncErrorCount: 0,
    oauthClientId: "client-123",
    encryptedTokens: new ArrayBuffer(8),
    // Far in the future — ensureAccessToken returns existing token without refresh
    tokenExpiresAt: Date.now() + 3_600_000,
    ...overrides,
  } as Doc<"calendarConnections">;
}

function makeCtx(): ActionCtx {
  return {
    runMutation: vi.fn().mockResolvedValue(true),
    runQuery: vi.fn(),
  } as unknown as ActionCtx;
}

function makeCalendarListResponse(
  items: Array<{
    id: string;
    summary: string;
    summaryOverride?: string;
    primary?: boolean;
    backgroundColor?: string;
  }>,
  nextPageToken?: string,
) {
  return Response.json({ items, ...(nextPageToken ? { nextPageToken } : {}) });
}

describe("GoogleCalendarProvider.listSubCalendars", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  test("maps id, summary, and primary=false for a standard calendar", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(
      makeCalendarListResponse([{ id: "work@example.com", summary: "Work" }]),
    );

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result).toEqual([{ id: "work@example.com", label: "Work", primary: false }]);
  });

  test("uses summaryOverride as label when present", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(
      makeCalendarListResponse([
        { id: "cal@example.com", summary: "My Calendar", summaryOverride: "Custom Label" },
      ]),
    );

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result[0].label).toBe("Custom Label");
  });

  test("sets primary=true for the primary calendar entry", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(
      makeCalendarListResponse([{ id: "primary@example.com", summary: "Primary", primary: true }]),
    );

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result[0].primary).toBe(true);
  });

  test("handles pagination by following nextPageToken until exhausted", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        makeCalendarListResponse([{ id: "cal-1@example.com", summary: "Cal 1" }], "token-page-2"),
      )
      .mockResolvedValueOnce(
        makeCalendarListResponse([{ id: "cal-2@example.com", summary: "Cal 2" }]),
      );

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("cal-1@example.com");
    expect(result[1].id).toBe("cal-2@example.com");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);

    const secondCallUrl = vi.mocked(fetch).mock.calls[1][0] as string;
    expect(secondCallUrl).toContain("pageToken=token-page-2");
  });

  test("returns an empty array when Google returns no items", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}));

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result).toEqual([]);
  });

  test("throws an auth error when oauthClientId is missing", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection({ oauthClientId: undefined });

    await expect(GoogleCalendarProvider.listSubCalendars!(ctx, conn)).rejects.toMatchObject({
      kind: "auth",
    });
  });

  test("sends maxResults=250 in the request URL", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(makeCalendarListResponse([]));

    await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("maxResults=250");
  });

  test("does not set minAccessRole in the request URL", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(makeCalendarListResponse([]));

    await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("minAccessRole");
  });

  test("forwards backgroundColor as the SubCalendar colour when present", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(
      makeCalendarListResponse([
        { id: "work@example.com", summary: "Work", backgroundColor: "#9fe1e7" },
      ]),
    );

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result[0].color).toBe("#9fe1e7");
  });

  test("leaves color undefined when Google omits backgroundColor", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(
      makeCalendarListResponse([{ id: "work@example.com", summary: "Work" }]),
    );

    const result = await GoogleCalendarProvider.listSubCalendars!(ctx, conn);

    expect(result[0].color).toBeUndefined();
  });

  test("throws an auth error when Google API returns a non-ok status", async () => {
    const { GoogleCalendarProvider } = await import("./google");
    const ctx = makeCtx();
    const conn = makeConnection();

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(GoogleCalendarProvider.listSubCalendars!(ctx, conn)).rejects.toMatchObject({
      kind: "auth",
    });
  });
});
