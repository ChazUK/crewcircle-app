/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { encryptJson } from "../domain/crypto";
import { fetchICalFeed } from "./ical";

const modules = import.meta.glob("/convex/**/*.ts");

const TEST_KEY = btoa(String.fromCharCode(...new Array(32).fill(1)));

async function insertUser(t: TestConvex<typeof schema>) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "owner",
      email: "owner@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function insertICalConnection(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  overrides: Partial<{
    icalUrl: ArrayBuffer;
    icalEtag: string;
    icalLastModified: string;
  }> = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label: "Test Feed",
      color: "#6366f1",
      createdAt: 0,
      syncErrorCount: 0,
      ...overrides,
    }),
  );
}

describe("fetchICalFeed", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("returns text on a 200 response", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => "BEGIN:VCALENDAR\nEND:VCALENDAR",
      }),
    );

    const result = await t.action((ctx) => fetchICalFeed(ctx, connection!));

    expect(result).toEqual({ unchanged: false, text: "BEGIN:VCALENDAR\nEND:VCALENDAR" });
  });

  test("sends If-None-Match header when icalEtag is stored", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, {
      icalUrl: encryptedUrl,
      icalEtag: '"abc123"',
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "BEGIN:VCALENDAR\nEND:VCALENDAR",
    });
    vi.stubGlobal("fetch", fetchMock);

    await t.action((ctx) => fetchICalFeed(ctx, connection!));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/cal.ics",
      expect.objectContaining({
        headers: expect.objectContaining({ "If-None-Match": '"abc123"' }),
      }),
    );
  });

  test("sends If-Modified-Since header when icalLastModified is stored", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, {
      icalUrl: encryptedUrl,
      icalLastModified: "Wed, 01 Jan 2025 00:00:00 GMT",
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "BEGIN:VCALENDAR\nEND:VCALENDAR",
    });
    vi.stubGlobal("fetch", fetchMock);

    await t.action((ctx) => fetchICalFeed(ctx, connection!));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/cal.ics",
      expect.objectContaining({
        headers: expect.objectContaining({
          "If-Modified-Since": "Wed, 01 Jan 2025 00:00:00 GMT",
        }),
      }),
    );
  });

  test("returns { unchanged: true } on 304", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, {
      icalUrl: encryptedUrl,
      icalEtag: '"abc123"',
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 304,
        headers: { get: () => null },
      }),
    );

    const result = await t.action((ctx) => fetchICalFeed(ctx, connection!));

    expect(result).toEqual({ unchanged: true });
  });

  test("throws SyncError { kind: 'network' } on non-ok response", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: () => null },
      }),
    );

    await expect(t.action((ctx) => fetchICalFeed(ctx, connection!))).rejects.toMatchObject({
      kind: "network",
      message: "HTTP 503",
    });
  });

  test("stores ETag from response headers after successful fetch", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"newetag"' : null),
        },
        text: async () => "BEGIN:VCALENDAR\nEND:VCALENDAR",
      }),
    );

    await t.action((ctx) => fetchICalFeed(ctx, connection!));

    const updated = await t.run((ctx) => ctx.db.get(connectionId));
    expect(updated?.icalEtag).toBe('"newetag"');
  });

  test("stores Last-Modified from response headers after successful fetch", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const lastMod = "Thu, 01 May 2025 12:00:00 GMT";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "Last-Modified" ? lastMod : null),
        },
        text: async () => "BEGIN:VCALENDAR\nEND:VCALENDAR",
      }),
    );

    await t.action((ctx) => fetchICalFeed(ctx, connection!));

    const updated = await t.run((ctx) => ctx.db.get(connectionId));
    expect(updated?.icalLastModified).toBe(lastMod);
  });

  test("does not call updateICalMeta when no cache headers are present", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, {
      icalUrl: encryptedUrl,
      icalEtag: '"existing"',
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => "BEGIN:VCALENDAR\nEND:VCALENDAR",
      }),
    );

    await t.action((ctx) => fetchICalFeed(ctx, connection!));

    const updated = await t.run((ctx) => ctx.db.get(connectionId));
    expect(updated?.icalEtag).toBe('"existing"');
  });

  test("throws SyncError { kind: 'network' } when icalUrl is missing", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertICalConnection(t, userId);
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    await expect(t.action((ctx) => fetchICalFeed(ctx, connection!))).rejects.toMatchObject({
      kind: "network",
    });
  });
});
