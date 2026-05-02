/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { RETRY_DELAYS_MS, runSyncWithRetry } from "./syncWithRetry";

const modules = import.meta.glob("/convex/**/*.ts");

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

async function insertConnection(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  overrides: Partial<{
    syncErrorCount: number;
    lastSyncError: string;
    lastSyncedAt: number;
  }> = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label: "Test",
      color: "#6366f1",
      createdAt: 0,
      syncErrorCount: 0,
      ...overrides,
    }),
  );
}

async function listScheduledSyncRetries(t: TestConvex<typeof schema>) {
  const all = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  return all.filter((row) => row.name === "calendars/syncWithRetry:syncWithRetry");
}

describe("runSyncWithRetry", () => {
  // Fake timers prevent the queued retry's setTimeout from firing on
  // teardown — its production target invokes the real iCal provider
  // (which throws "Not implemented") outside any transaction and surfaces
  // as an unhandled rejection. Real timers are restored in afterEach
  // without firing the queued callbacks.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("does not touch error state when sync resolves", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);
    const sync = vi.fn(async () => {});

    await t.action((ctx) => runSyncWithRetry(ctx, connectionId, sync));

    expect(sync).toHaveBeenCalledTimes(1);
    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.syncErrorCount).toBe(0);
    expect(conn?.lastSyncError).toBeUndefined();
    const scheduled = await listScheduledSyncRetries(t);
    expect(scheduled).toHaveLength(0);
  });

  test("on first failure increments syncErrorCount and stores the error message", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);

    await t.action((ctx) =>
      runSyncWithRetry(ctx, connectionId, async () => {
        throw new Error("provider unreachable");
      }),
    );

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.syncErrorCount).toBe(1);
    expect(conn?.lastSyncError).toBe("provider unreachable");
  });

  test("schedules the next attempt 15 minutes out after the 1st failure", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);

    const before = Date.now();
    await t.action((ctx) =>
      runSyncWithRetry(ctx, connectionId, async () => {
        throw new Error("boom");
      }),
    );

    const scheduled = await listScheduledSyncRetries(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].scheduledTime - before).toBeGreaterThanOrEqual(RETRY_DELAYS_MS[0]);
    expect(scheduled[0].scheduledTime - before).toBeLessThan(RETRY_DELAYS_MS[0] + 1000);
    expect(scheduled[0].args).toEqual([{ connectionId }]);
  });

  test("schedules the next attempt 30 minutes out after the 2nd failure", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, { syncErrorCount: 1 });

    const before = Date.now();
    await t.action((ctx) =>
      runSyncWithRetry(ctx, connectionId, async () => {
        throw new Error("boom");
      }),
    );

    const scheduled = await listScheduledSyncRetries(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].scheduledTime - before).toBeGreaterThanOrEqual(RETRY_DELAYS_MS[1]);
    expect(scheduled[0].scheduledTime - before).toBeLessThan(RETRY_DELAYS_MS[1] + 1000);
  });

  test("schedules the next attempt 60 minutes out after the 3rd failure", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, { syncErrorCount: 2 });

    const before = Date.now();
    await t.action((ctx) =>
      runSyncWithRetry(ctx, connectionId, async () => {
        throw new Error("boom");
      }),
    );

    const scheduled = await listScheduledSyncRetries(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].scheduledTime - before).toBeGreaterThanOrEqual(RETRY_DELAYS_MS[2]);
    expect(scheduled[0].scheduledTime - before).toBeLessThan(RETRY_DELAYS_MS[2] + 1000);
  });

  test("stops scheduling once syncErrorCount exceeds the retry budget", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, { syncErrorCount: 3 });

    await t.action((ctx) =>
      runSyncWithRetry(ctx, connectionId, async () => {
        throw new Error("still down");
      }),
    );

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.syncErrorCount).toBe(4);
    expect(conn?.lastSyncError).toBe("still down");
    const scheduled = await listScheduledSyncRetries(t);
    expect(scheduled).toHaveLength(0);
  });

  test("coerces non-Error thrown values to a string before storing", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);

    await t.action((ctx) =>
      runSyncWithRetry(ctx, connectionId, async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "oh no";
      }),
    );

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.lastSyncError).toBe("oh no");
  });

  test("on success, the injected sync's reset of error state is preserved", async () => {
    // runSyncWithRetry alone does not reset on success — that responsibility
    // sits with CalendarService.sync's success-path write
    // (markConnectionSynced). This test pins the contract: when the
    // injected sync DOES touch the connection (as the real sync does),
    // runSyncWithRetry preserves those writes and adds nothing of its own.
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId, {
      syncErrorCount: 5,
      lastSyncError: "old failure",
    });

    const sync = async (
      ctx: Parameters<typeof runSyncWithRetry>[0],
      id: Id<"calendarConnections">,
    ) => {
      await ctx.runMutation(internal.calendars.db.markConnectionSynced.markConnectionSynced, {
        connectionId: id,
      });
    };

    await t.action((ctx) => runSyncWithRetry(ctx, connectionId, sync));

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.syncErrorCount).toBe(0);
    expect(conn?.lastSyncError).toBeUndefined();
    expect(conn?.lastSyncedAt).toBeTypeOf("number");
  });
});
