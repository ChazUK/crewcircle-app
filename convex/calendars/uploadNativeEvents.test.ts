/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const ownerIdentity = {
  subject: "owner_clerk",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|owner_clerk",
};

const otherIdentity = {
  subject: "other_clerk",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|other_clerk",
};

async function seed(t: TestConvex<typeof schema>) {
  const owner = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: ownerIdentity.subject,
      email: "owner@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
  const other = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: otherIdentity.subject,
      email: "other@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
  const connectionId = await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId: owner,
      provider: "native",
      label: "Phone",
      createdAt: Date.now(),
      color: "#6366f1",
      syncErrorCount: 0,
    }),
  );
  const subCalendarId = await t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId: "device-cal-1",
      label: "Personal",
      showAsBusy: true,
    }),
  );
  return { owner, other, connectionId, subCalendarId };
}

function makeEvent(subCalendarId: string, overrides: Record<string, unknown> = {}) {
  return {
    externalId: "ext-1",
    subCalendarId,
    title: "Shoot day",
    startsAt: Date.now(),
    endsAt: Date.now() + 3_600_000,
    isAllDay: false,
    ...overrides,
  };
}

describe("uploadNativeEvents", () => {
  test("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);
    await expect(
      t.action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [],
      }),
    ).rejects.toThrow("Not authenticated");
  });

  test("throws when authenticated user does not own the connection", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);
    await expect(
      t.withIdentity(otherIdentity).action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [],
      }),
    ).rejects.toThrow("Connection not found");
  });

  test("stores events in the matching sub-calendar", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await t
      .withIdentity(ownerIdentity)
      .action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [makeEvent("device-cal-1")],
      });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe("ext-1");
    expect(events[0].title).toBe("Shoot day");
  });

  test("silently skips events for a sub-calendar not enabled on this connection", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await t
      .withIdentity(ownerIdentity)
      .action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [makeEvent("unknown-cal-id")],
      });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toHaveLength(0);
  });

  test("stores events for multiple sub-calendars in one call", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await t.run((ctx) =>
      ctx.db.insert("calendarSubCalendars", {
        connectionId,
        externalId: "device-cal-2",
        label: "Work",
        showAsBusy: true,
      }),
    );

    await t
      .withIdentity(ownerIdentity)
      .action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [
          makeEvent("device-cal-1", { externalId: "a1" }),
          makeEvent("device-cal-2", { externalId: "b1" }),
        ],
      });

    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(events).toHaveLength(2);
  });

  test("stamps lastSyncedAt on the connection after uploading", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);
    const before = Date.now();

    await t
      .withIdentity(ownerIdentity)
      .action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [],
      });

    const connection = await t.run((ctx) => ctx.db.get(connectionId));
    expect(connection?.lastSyncedAt).toBeGreaterThanOrEqual(before);
  });

  test("succeeds with an empty events array", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await expect(
      t.withIdentity(ownerIdentity).action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events: [],
      }),
    ).resolves.not.toThrow();
  });

  test("rejects connections whose provider is not native", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: ownerIdentity.subject,
        email: "owner@example.com",
        hasCompletedOnboarding: false,
        isPublic: false,
      }),
    );
    const icalConnectionId = await t.run((ctx) =>
      ctx.db.insert("calendarConnections", {
        userId: owner,
        provider: "ical",
        label: "Subscribed feed",
        createdAt: Date.now(),
        color: "#6366f1",
        syncErrorCount: 0,
      }),
    );

    await expect(
      t.withIdentity(ownerIdentity).action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId: icalConnectionId,
        events: [],
      }),
    ).rejects.toThrow(/provider="native"/);
  });

  test("uploads more than 200 events for a single sub-calendar without prune-induced loss", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);
    const events = Array.from({ length: 350 }, (_, i) => ({
      externalId: `evt-${i}`,
      subCalendarId: "device-cal-1",
      title: `Event ${i}`,
      startsAt: Date.now() + i * 1_000,
      endsAt: Date.now() + i * 1_000 + 60_000,
      isAllDay: false,
    }));

    await t
      .withIdentity(ownerIdentity)
      .action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events,
      });

    const stored = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(stored).toHaveLength(350);
  });
});
