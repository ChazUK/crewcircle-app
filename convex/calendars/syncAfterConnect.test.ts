/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { syncAfterConnect } from "./syncAfterConnect";

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

async function insertConnection(t: TestConvex<typeof schema>, userId: Id<"users">) {
  return t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      userId,
      provider: "ical",
      label: "Test",
      color: "#6366f1",
      createdAt: 0,
      syncErrorCount: 0,
    }),
  );
}

describe("syncAfterConnect", () => {
  // Fake timers prevent the runAfter(0, ...) callback from firing on the
  // next tick — its production target invokes the real iCal provider
  // (which throws "Not implemented") outside any transaction and surfaces
  // as an unhandled rejection. Real timers are restored in afterEach
  // without firing the queued callbacks.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("schedules syncWithRetry with no delay for the given connection", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const connectionId = await insertConnection(t, userId);

    const before = Date.now();
    await t.action((ctx) => syncAfterConnect(ctx, connectionId));

    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    const retries = scheduled.filter((row) => row.name === "calendars/syncWithRetry:syncWithRetry");
    expect(retries).toHaveLength(1);
    expect(retries[0].scheduledTime - before).toBeLessThan(1000);
    expect(retries[0].args).toEqual([{ connectionId }]);
  });
});
