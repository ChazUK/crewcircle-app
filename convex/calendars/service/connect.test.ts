import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderRegistry,
} from "@shared/calendars";
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { encryptJson } from "../domain/crypto";
import { createCalendarService } from "./index";

const modules = import.meta.glob("/convex/**/*.ts");

const TEST_KEY = btoa(String.fromCharCode(...new Array(32).fill(1)));

const identity = {
  subject: "clerk_user_42",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_42",
};

async function insertUser(t: TestConvex<typeof schema>, externalAuthId: string) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId,
      email: `${externalAuthId}@example.com`,
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
}

async function insertConnectionForColours(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  color: string,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label: "Existing",
      color,
      createdAt: Date.now(),
      syncErrorCount: 0,
    }),
  );
}

type StubCall = {
  params: CalendarConnectParams;
  context: CalendarConnectContext;
};

function makeStubProvider(
  result: () => CalendarConnectResult,
  calls: StubCall[],
): CalendarProvider {
  return {
    capabilities: {
      serverSidePullable: true,
      writable: false,
      hasSubCalendars: false,
    },
    async connect(_ctx, params, context) {
      calls.push({ params, context });
      return result();
    },
  };
}

function buildRegistry(
  result: () => CalendarConnectResult,
  calls: StubCall[],
): CalendarProviderRegistry {
  const provider = makeStubProvider(result, calls);
  return {
    google: provider,
    microsoft: provider,
    ical: provider,
    native: provider,
  };
}

const emptyResult = (): CalendarConnectResult => ({
  connection: {},
  subCalendars: [],
});

describe("CalendarService.connect", () => {
  // Fake timers prevent the post-connect runAfter(0, ...) callback from
  // firing on the next tick — its production target invokes the real
  // iCal provider (which throws "Not implemented") outside any
  // transaction and surfaces as an unhandled rejection. Real timers are
  // restored in afterEach without firing the queued callbacks.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test("throws when the caller is not authenticated", async () => {
    const t = convexTest(schema, modules);
    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    await expect(
      t.action(async (ctx) =>
        service.connect(ctx, {
          provider: "ical",
          url: "https://example.com/cal.ics",
          label: "Mine",
        }),
      ),
    ).rejects.toThrow("Not authenticated");
    expect(calls).toEqual([]);
  });

  test("assigns a palette colour and forwards it to the provider via context", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);

    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "google",
        authCode: "code",
        codeVerifier: "verifier",
        clientId: "client-1",
        redirectUri: "https://app.example/callback",
        label: "Work",
      }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].context.userId).toBe(userId);
    expect(calls[0].context.color).toBe("#6366f1");
  });

  test("picks the next unused palette colour when the user already has connections", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, identity.subject);
    await insertConnectionForColours(t, userId, "#6366f1");
    await insertConnectionForColours(t, userId, "#10b981");

    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "google",
        authCode: "code",
        codeVerifier: "verifier",
        clientId: "client-1",
        redirectUri: "https://app.example/callback",
        label: "Work",
      }),
    );

    expect(calls[0].context.color).toBe("#f59e0b");
  });

  test("inserts every sub-calendar in the provider's blueprint", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);

    const encryptedUrl = await encryptJson("https://example.com/cal.ics");
    const calls: StubCall[] = [];
    const service = createCalendarService(
      buildRegistry(
        () => ({
          connection: { icalUrl: encryptedUrl },
          subCalendars: [{ externalId: "default", label: "Family iCloud", showAsBusy: true }],
        }),
        calls,
      ),
    );

    const newConnectionId = await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "ical",
        url: "https://example.com/cal.ics",
        label: "Family iCloud",
      }),
    );

    const subCalendars = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", newConnectionId))
        .collect(),
    );
    expect(subCalendars).toHaveLength(1);
    expect(subCalendars[0]).toMatchObject({
      connectionId: newConnectionId,
      externalId: "default",
      label: "Family iCloud",
      showAsBusy: true,
    });
  });

  test("inserts no sub-calendars when the blueprint has none", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);

    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "google",
        authCode: "code",
        codeVerifier: "verifier",
        clientId: "client-1",
        redirectUri: "https://app.example/callback",
        label: "Work",
      }),
    );

    const subCalendars = await t.run((ctx) => ctx.db.query("calendarSubCalendars").collect());
    expect(subCalendars).toEqual([]);
  });

  test("returns the connectionId of the inserted Calendar Connection", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);

    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    const returned = await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "native",
        deviceCalendarId: "device-cal-1",
        label: "Phone",
      }),
    );

    const row = await t.run((ctx) => ctx.db.get(returned));
    expect(row?._id).toBe(returned);
    expect(row?.provider).toBe("native");
    expect(row?.label).toBe("Phone");
  });

  test("delegates to the provider matching the params.provider discriminant", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);

    const microsoftCalls: StubCall[] = [];
    const otherCalls: StubCall[] = [];
    const microsoftProvider = makeStubProvider(emptyResult, microsoftCalls);
    const otherProvider = makeStubProvider(emptyResult, otherCalls);

    const service = createCalendarService({
      google: otherProvider,
      microsoft: microsoftProvider,
      ical: otherProvider,
      native: otherProvider,
    });

    await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "microsoft",
        authCode: "code",
        codeVerifier: "verifier",
        clientId: "client-1",
        redirectUri: "https://app.example/callback",
        label: "Outlook",
      }),
    );

    expect(microsoftCalls).toHaveLength(1);
    expect(otherCalls).toEqual([]);
  });

  test("schedules an immediate post-connect sync for non-native providers", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);

    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    const newConnectionId = await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "ical",
        url: "https://example.com/cal.ics",
        label: "Family iCloud",
      }),
    );

    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    const retries = scheduled.filter((row) => row.name === "calendars/syncWithRetry:syncWithRetry");
    expect(retries).toHaveLength(1);
    expect(retries[0].args).toEqual([{ connectionId: newConnectionId }]);
  });

  test("does NOT schedule a post-connect sync for native connections", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, identity.subject);

    const calls: StubCall[] = [];
    const service = createCalendarService(buildRegistry(emptyResult, calls));

    await t.withIdentity(identity).action(async (ctx) =>
      service.connect(ctx, {
        provider: "native",
        deviceCalendarId: "device-cal-1",
        label: "Phone",
      }),
    );

    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    const retries = scheduled.filter((row) => row.name === "calendars/syncWithRetry:syncWithRetry");
    expect(retries).toEqual([]);
  });
});
