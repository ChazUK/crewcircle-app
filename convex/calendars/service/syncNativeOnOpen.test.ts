import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderRegistry,
} from "@shared/calendars";
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { createCalendarService } from "./index";

const modules = import.meta.glob("/convex/**/*.ts");

const ownerIdentity = {
  subject: "owner_clerk",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|owner_clerk",
};

const stubProvider: CalendarProvider = {
  capabilities: { serverSidePullable: false, writable: false, hasSubCalendars: false },
  async connect(
    _ctx: unknown,
    _params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    throw new Error("not used by syncNativeOnOpen");
  },
};

const stubRegistry: CalendarProviderRegistry = {
  google: stubProvider,
  ical: stubProvider,
  microsoft: stubProvider,
  native: stubProvider,
};

const service = createCalendarService(stubRegistry);

async function insertOwner(t: TestConvex<typeof schema>): Promise<Id<"users">> {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: ownerIdentity.subject,
      email: "owner@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function insertConnection(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  provider: "google" | "ical" | "microsoft" | "native",
  overrides: Partial<{ lastSyncedAt: number }> = {},
): Promise<Id<"calendarConnections">> {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider,
      label: `${provider} test`,
      color: "#6366f1",
      createdAt: 0,
      syncErrorCount: 0,
      ...overrides,
    }),
  );
}

async function insertSubCalendar(
  t: TestConvex<typeof schema>,
  connectionId: Id<"calendarConnections">,
  externalId: string,
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId,
      label: externalId,
      showAsBusy: true,
    }),
  );
}

describe("CalendarService.syncNativeOnOpen", () => {
  test("returns native connections that have never been synced", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertOwner(t);
    const connectionId = await insertConnection(t, userId, "native");
    await insertSubCalendar(t, connectionId, "device-cal-1");
    await insertSubCalendar(t, connectionId, "device-cal-2");

    const result = await t
      .withIdentity(ownerIdentity)
      .action(async (ctx) => service.syncNativeOnOpen(ctx));

    expect(result).toHaveLength(1);
    expect(result[0].connectionId).toBe(connectionId);
    expect(result[0].nativeCalendarIds.sort()).toEqual(["device-cal-1", "device-cal-2"]);
  });

  test("skips native connections synced within the last 60 seconds", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertOwner(t);
    const recentConnectionId = await insertConnection(t, userId, "native", {
      lastSyncedAt: Date.now() - 30_000,
    });
    await insertSubCalendar(t, recentConnectionId, "device-cal-recent");
    const staleConnectionId = await insertConnection(t, userId, "native", {
      lastSyncedAt: Date.now() - 90_000,
    });
    await insertSubCalendar(t, staleConnectionId, "device-cal-stale");

    const result = await t
      .withIdentity(ownerIdentity)
      .action(async (ctx) => service.syncNativeOnOpen(ctx));

    expect(result.map((row) => row.connectionId)).toEqual([staleConnectionId]);
  });

  test("excludes non-native providers", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertOwner(t);
    const googleConnectionId = await insertConnection(t, userId, "google");
    await insertSubCalendar(t, googleConnectionId, "primary");
    const nativeConnectionId = await insertConnection(t, userId, "native");
    await insertSubCalendar(t, nativeConnectionId, "device-cal");

    const result = await t
      .withIdentity(ownerIdentity)
      .action(async (ctx) => service.syncNativeOnOpen(ctx));

    expect(result.map((row) => row.connectionId)).toEqual([nativeConnectionId]);
  });

  test("returns an empty list when the user has no native connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertOwner(t);
    const googleConnectionId = await insertConnection(t, userId, "google");
    await insertSubCalendar(t, googleConnectionId, "primary");

    const result = await t
      .withIdentity(ownerIdentity)
      .action(async (ctx) => service.syncNativeOnOpen(ctx));

    expect(result).toEqual([]);
  });

  test("includes native connections at the 60-second debounce boundary", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertOwner(t);
    const connectionId = await insertConnection(t, userId, "native", {
      lastSyncedAt: Date.now() - 60_000,
    });
    await insertSubCalendar(t, connectionId, "device-cal");

    const result = await t
      .withIdentity(ownerIdentity)
      .action(async (ctx) => service.syncNativeOnOpen(ctx));

    expect(result.map((row) => row.connectionId)).toEqual([connectionId]);
  });
});
