/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { encryptJson } from "../domain/crypto";
import { fetchICalFeed, ICalProvider } from "./ical";

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

describe("ICalProvider.fetchEvents", () => {
  const WINDOW = {
    windowStartMs: new Date("2025-06-01T00:00:00Z").getTime(),
    windowEndMs: new Date("2025-12-31T23:59:59Z").getTime(),
  };

  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("returns empty array when feed is unchanged (304)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, {
      icalUrl: encryptedUrl,
      icalEtag: '"abc"',
    });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 304, headers: { get: () => null } }),
    );

    const result = await t.action((ctx) => ICalProvider.fetchEvents!(ctx, connection!, WINDOW));

    expect(result).toEqual([]);
  });

  test("parses VEVENT components and returns IncomingEvent array", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250615T100000Z
DTEND:20250615T110000Z
SUMMARY:June Meeting
END:VEVENT
END:VCALENDAR`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => ical,
      }),
    );

    const result = await t.action((ctx) => ICalProvider.fetchEvents!(ctx, connection!, WINDOW));

    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("event1@example.com");
    expect(result[0].externalId).toBe("default::event1@example.com");
    expect(result[0].title).toBe("June Meeting");
    expect(result[0].subCalendarId).toBe("default");
  });

  test("excludes TRANSPARENT events", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:opaque@example.com
DTSTART:20250615T100000Z
DTEND:20250615T110000Z
SUMMARY:Opaque
TRANSP:OPAQUE
END:VEVENT
BEGIN:VEVENT
UID:transparent@example.com
DTSTART:20250615T100000Z
DTEND:20250615T110000Z
SUMMARY:Blocked
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => ical,
      }),
    );

    const result = await t.action((ctx) => ICalProvider.fetchEvents!(ctx, connection!, WINDOW));

    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("opaque@example.com");
  });

  test("includes recurring events (has RRULE) regardless of DTSTART position", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    // DTSTART is before the window but it has an RRULE — must be included
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:recurring@example.com
DTSTART:20240101T100000Z
DTEND:20240101T110000Z
RRULE:FREQ=WEEKLY;BYDAY=MO
SUMMARY:Weekly standup
END:VEVENT
END:VCALENDAR`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => ical,
      }),
    );

    const result = await t.action((ctx) => ICalProvider.fetchEvents!(ctx, connection!, WINDOW));

    expect(result).toHaveLength(1);
    expect(result[0].rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
  });

  test("excludes non-recurring events outside the sync window", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:past@example.com
DTSTART:20200101T100000Z
DTEND:20200101T110000Z
SUMMARY:Old event
END:VEVENT
BEGIN:VEVENT
UID:future@example.com
DTSTART:20300101T100000Z
DTEND:20300101T110000Z
SUMMARY:Far future event
END:VEVENT
BEGIN:VEVENT
UID:inwindow@example.com
DTSTART:20250615T100000Z
DTEND:20250615T110000Z
SUMMARY:In window
END:VEVENT
END:VCALENDAR`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => ical,
      }),
    );

    const result = await t.action((ctx) => ICalProvider.fetchEvents!(ctx, connection!, WINDOW));

    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("inwindow@example.com");
  });

  test("converts dates to UTC milliseconds", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const connectionId = await insertICalConnection(t, userId, { icalUrl: encryptedUrl });
    const connection = await t.run((ctx) => ctx.db.get(connectionId));

    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:dates@example.com
DTSTART:20250615T120000Z
DTEND:20250615T130000Z
SUMMARY:Date test
END:VEVENT
END:VCALENDAR`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => ical,
      }),
    );

    const result = await t.action((ctx) => ICalProvider.fetchEvents!(ctx, connection!, WINDOW));

    expect(result[0].startsAt).toBe(Date.UTC(2025, 5, 15, 12, 0, 0));
    expect(result[0].endsAt).toBe(Date.UTC(2025, 5, 15, 13, 0, 0));
  });
});
