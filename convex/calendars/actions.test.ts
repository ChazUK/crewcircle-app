import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

type TestHarness = TestConvex<typeof schema>;

const identity = {
  subject: "clerk_user_1",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_1",
};

const minimalIcs = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:sample-1",
  "SUMMARY:Sample",
  "DTSTART:20260501T090000Z",
  "DTEND:20260501T100000Z",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

function stubFetchOk(body: string) {
  const fn = vi.fn(
    async () => new Response(body, { status: 200, headers: { "Content-Type": "text/calendar" } }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

function stubFetchStatus(status: number, body = "") {
  const fn = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function seedUser(t: TestHarness) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: identity.subject,
      email: "me@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function readEvents(t: TestHarness, connectionId: Id<"calendarConnections">) {
  return t.run((ctx) =>
    ctx.db
      .query("calendarEvents")
      .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
      .collect(),
  );
}

async function readConnection(t: TestHarness, id: Id<"calendarConnections">) {
  return t.run((ctx) => ctx.db.get(id));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connectIcal", () => {
  test("rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" }),
    ).rejects.toThrow(/authenticated/);
  });

  test("rejects a URL pointing at a private network before storing anything", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.connectIcal, { url: "http://127.0.0.1/feed.ics" }),
    ).rejects.toThrow(/private or reserved/);
    const rows = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    expect(rows).toEqual([]);
  });

  test("stores the connection and fetched events on success", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const fetchFn = stubFetchOk(minimalIcs);

    const connectionId = await t.withIdentity(identity).action(api.calendars.actions.connectIcal, {
      url: "https://example.com/feed.ics",
      label: "Holidays",
    });

    expect(fetchFn).toHaveBeenCalledOnce();
    const events = await readEvents(t, connectionId);
    expect(events.map((e) => e.externalId)).toEqual(["sample-1"]);
    const connection = await readConnection(t, connectionId);
    expect(connection?.label).toBe("Holidays");
    expect(connection?.lastSyncError).toBeUndefined();
  });

  test("normalizes webcal:// URLs before storing them", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetchOk(minimalIcs);
    const connectionId = await t.withIdentity(identity).action(api.calendars.actions.connectIcal, {
      url: "webcal://example.com/feed.ics",
    });
    const connection = await readConnection(t, connectionId);
    expect(connection?.icalUrl).toBe("https://example.com/feed.ics");
  });

  test("falls back to the hostname when no label is given", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetchOk(minimalIcs);
    const connectionId = await t
      .withIdentity(identity)
      .action(api.calendars.actions.connectIcal, { url: "https://calendars.test/feed.ics" });
    const connection = await readConnection(t, connectionId);
    expect(connection?.label).toBe("calendars.test");
  });

  test("records the error and rethrows when the fetch fails", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetchStatus(404, "not found");
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" }),
    ).rejects.toThrow(/404/);
    const connections = await t.run((ctx) => ctx.db.query("calendarConnections").collect());
    expect(connections).toHaveLength(1);
    expect(connections[0].lastSyncError).toMatch(/404/);
  });

  test("refuses to follow a redirect to a private network", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("", {
          status: 302,
          headers: { Location: "http://169.254.169.254/latest/meta-data/" },
        });
      }),
    );
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" }),
    ).rejects.toThrow(/private or reserved/);
  });

  test("refuses to follow a redirect to an IPv4-mapped loopback", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("", {
          status: 301,
          headers: { Location: "http://[::ffff:127.0.0.1]/feed.ics" },
        });
      }),
    );
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" }),
    ).rejects.toThrow(/private or reserved/);
  });

  test("follows a safe redirect chain and fetches the final response", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "https://example.com/feed.ics") {
        return new Response("", {
          status: 302,
          headers: { Location: "https://cdn.example.com/feed.ics" },
        });
      }
      return new Response(minimalIcs, {
        status: 200,
        headers: { "Content-Type": "text/calendar" },
      });
    });
    vi.stubGlobal("fetch", fetchFn);
    const connectionId = await t
      .withIdentity(identity)
      .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" });
    const events = await readEvents(t, connectionId);
    expect(events.map((e) => e.externalId)).toEqual(["sample-1"]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("rejects a redirect loop past the hop limit", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        // Resolve to a new URL each hop so we exceed the hop budget rather
        // than triggering a different check.
        const next = url.endsWith(".ics") ? `${url.replace(/\.ics$/, "")}-1.ics` : `${url}-1.ics`;
        return new Response("", { status: 302, headers: { Location: next } });
      }),
    );
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" }),
    ).rejects.toThrow(/exceeded .* redirects/);
  });
});

describe("connectApple", () => {
  test("stores the connection plus pushed events", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const connectionId = await t.withIdentity(identity).action(api.calendars.actions.connectApple, {
      label: "Apple",
      enabledSubCalendarIds: ["cal-1"],
      events: [
        {
          externalId: "cal-1::a",
          subCalendarId: "cal-1",
          title: "From device",
          startsAt: Date.UTC(2026, 4, 1, 9),
          endsAt: Date.UTC(2026, 4, 1, 10),
          isAllDay: false,
        },
      ],
    });
    const events = await readEvents(t, connectionId);
    expect(events.map((e) => e.title)).toEqual(["From device"]);
    const connection = await readConnection(t, connectionId);
    expect(connection?.enabledSubCalendarIds).toEqual(["cal-1"]);
    expect(connection?.lastSyncedAt).toBeTruthy();
  });
});

describe("uploadAppleEvents", () => {
  test("rejects when caller does not own the connection", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: "someone-else",
        email: "e@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId: owner,
        provider: "native",
        label: "Not mine",
        enabledSubCalendarIds: [],
        createdAt: Date.now(),
      }),
    );
    await seedUser(t);
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.uploadAppleEvents, { connectionId, events: [] }),
    ).rejects.toThrow(/not found/);
  });

  test("rejects when the connection is not an Apple one", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "Web",
        createdAt: Date.now(),
      }),
    );
    await expect(
      t
        .withIdentity(identity)
        .action(api.calendars.actions.uploadAppleEvents, { connectionId, events: [] }),
    ).rejects.toThrow(/Apple calendars/);
  });

  test("replaces events for a matching Apple connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "native",
        label: "Apple",
        enabledSubCalendarIds: ["cal"],
        createdAt: Date.now(),
      }),
    );
    await t.withIdentity(identity).action(api.calendars.actions.uploadAppleEvents, {
      connectionId,
      events: [
        {
          externalId: "cal::x",
          subCalendarId: "cal",
          title: "New",
          startsAt: Date.UTC(2026, 4, 1, 9),
          endsAt: Date.UTC(2026, 4, 1, 10),
          isAllDay: false,
        },
      ],
    });
    const events = await readEvents(t, connectionId);
    expect(events.map((e) => e.title)).toEqual(["New"]);
  });
});

describe("syncConnection", () => {
  test("refetches and replaces events for an iCal connection", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetchOk(minimalIcs);
    const connectionId = await t
      .withIdentity(identity)
      .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" });

    // Replace the fetch stub with a feed that has a different event
    const second = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:sample-2",
      "SUMMARY:After",
      "DTSTART:20260502T090000Z",
      "DTEND:20260502T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    stubFetchOk(second);

    await t.withIdentity(identity).action(api.calendars.actions.syncConnection, { connectionId });
    const events = await readEvents(t, connectionId);
    expect(events.map((e) => e.externalId)).toEqual(["sample-2"]);
  });

  test("rejects sync for an Apple connection (must come from device)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "native",
        label: "Apple",
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.syncConnection, { connectionId }),
    ).rejects.toThrow(/device/);
  });

  test("rejects an unknown connection id", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "to-delete",
        createdAt: Date.now(),
      }),
    );
    await t.run((ctx) => ctx.db.delete(connectionId));
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.syncConnection, { connectionId }),
    ).rejects.toThrow(/not found/);
  });
});

describe("syncIcalConnectionInternal", () => {
  test("records the error without throwing when the feed fails", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "Web",
        icalUrl: "https://example.com/feed.ics",
        createdAt: Date.now(),
      }),
    );
    stubFetchStatus(500, "boom");
    await t.action(internal.calendars.actions.syncIcalConnectionInternal, {
      connectionId,
      userId,
    });
    const connection = (await readConnection(t, connectionId)) as Doc<"calendarConnections">;
    expect(connection.lastSyncError).toMatch(/500/);
  });

  test("rejects when called for a non-ical provider", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "native",
        label: "Apple",
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.action(internal.calendars.actions.syncIcalConnectionInternal, {
        connectionId,
        userId,
      }),
    ).rejects.toThrow(/iCal connection/);
  });
});

describe("setEnabledSubCalendars", () => {
  test("throws ConvexError when enabledSubCalendarIds is empty", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "native",
        label: "Apple",
        enabledSubCalendarIds: ["cal-1"],
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.setEnabledSubCalendars, {
        connectionId,
        enabledSubCalendarIds: [],
      }),
    ).rejects.toThrow(/enabledSubCalendarIds must contain at least one/);
  });

  test("updates the enabled list for an iCal connection and re-fetches", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetchOk(minimalIcs);
    const connectionId = await t
      .withIdentity(identity)
      .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" });

    stubFetchOk(minimalIcs);
    await t.withIdentity(identity).action(api.calendars.actions.setEnabledSubCalendars, {
      connectionId,
      enabledSubCalendarIds: ["foo"],
    });
    // Drain the scheduled pruneDisabledSubCalendarEvents mutation before the
    // test ends so its writes don't leak past the transaction boundary.
    // convex-test enqueues runAfter(0) via real setTimeout — yield to the
    // event loop so the pending → inProgress transition happens before
    // finishAllScheduledFunctions polls.
    await new Promise((r) => setTimeout(r, 0));
    await t.finishAllScheduledFunctions(() => {});
    const connection = (await readConnection(t, connectionId)) as Doc<"calendarConnections">;
    expect(connection.enabledSubCalendarIds).toEqual(["foo"]);
  });
});

describe("disconnect", () => {
  test("removes the connection and all of its events", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    stubFetchOk(minimalIcs);
    const connectionId = await t
      .withIdentity(identity)
      .action(api.calendars.actions.connectIcal, { url: "https://example.com/feed.ics" });

    await t.withIdentity(identity).action(api.calendars.actions.disconnect, { connectionId });

    const connection = await readConnection(t, connectionId);
    expect(connection).toBeNull();
    const events = await readEvents(t, connectionId);
    expect(events).toEqual([]);
  });

  test("is a no-op when the connection does not exist", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const connectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId,
        provider: "ical",
        label: "gone",
        createdAt: Date.now(),
      }),
    );
    await t.run((ctx) => ctx.db.delete(connectionId));
    await expect(
      t.withIdentity(identity).action(api.calendars.actions.disconnect, { connectionId }),
    ).resolves.toBeNull();
  });
});
