/// <reference types="vite/client" />
import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderRegistry,
} from "@shared/calendars";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { createCalendarService } from "./index";

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

const stubProvider: CalendarProvider = {
  capabilities: { serverSidePullable: false, writable: false, hasSubCalendars: false },
  async connect(
    _ctx: unknown,
    _params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    throw new Error("not used by setEnabledSubCalendars");
  },
};

const stubRegistry: CalendarProviderRegistry = {
  google: stubProvider,
  ical: stubProvider,
  microsoft: stubProvider,
  native: stubProvider,
};

const service = createCalendarService(stubRegistry);

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
      provider: "google",
      label: "Work",
      createdAt: Date.now(),
      color: "#6366f1",
      syncErrorCount: 0,
    }),
  );
  return { owner, other, connectionId };
}

async function insertSubCalendar(
  t: TestConvex<typeof schema>,
  connectionId: Id<"calendarConnections">,
  externalId: string,
  label: string,
) {
  return t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId,
      label,
      showAsBusy: true,
    }),
  );
}

describe("CalendarService.setEnabledSubCalendars", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("inserts rows for newly selected sub-calendars when the caller owns the connection", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await t.withIdentity(ownerIdentity).action(async (ctx) => {
      await service.setEnabledSubCalendars(ctx, connectionId, [
        { externalId: "work@example.com", label: "Work" },
      ]);
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalId: "work@example.com",
      label: "Work",
      showAsBusy: true,
    });
  });

  test("removes deselected rows and prunes their events via scheduled deleteConnectionEvents", async () => {
    const t = convexTest(schema, modules);
    const { owner, connectionId } = await seed(t);
    const removed = await insertSubCalendar(t, connectionId, "old@example.com", "Old");
    await t.run((ctx) =>
      ctx.db.insert("calendarEvents", {
        userId: owner,
        connectionId,
        subCalendarId: removed,
        externalId: "evt-1",
        title: "evt-1",
        startsAt: Date.now(),
        endsAt: Date.now() + 60_000,
        isAllDay: false,
        updatedAt: Date.now(),
      }),
    );

    await t.withIdentity(ownerIdentity).action(async (ctx) => {
      await service.setEnabledSubCalendars(ctx, connectionId, []);
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    const events = await t.run((ctx) => ctx.db.query("calendarEvents").collect());
    expect(rows).toEqual([]);
    expect(events).toEqual([]);
  });

  test("throws when the caller is not authenticated and writes nothing", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await expect(
      t.action(async (ctx) => {
        await service.setEnabledSubCalendars(ctx, connectionId, [
          { externalId: "work@example.com", label: "Work" },
        ]);
      }),
    ).rejects.toThrow(/not authenticated/i);

    const rows = await t.run((ctx) => ctx.db.query("calendarSubCalendars").collect());
    expect(rows).toEqual([]);
  });

  test("throws when the caller does not own the connection and writes nothing", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await expect(
      t.withIdentity(otherIdentity).action(async (ctx) => {
        await service.setEnabledSubCalendars(ctx, connectionId, [
          { externalId: "work@example.com", label: "Work" },
        ]);
      }),
    ).rejects.toThrow(/not found/i);

    const rows = await t.run((ctx) => ctx.db.query("calendarSubCalendars").collect());
    expect(rows).toEqual([]);
  });

  test("leaves unchanged sub-calendars untouched", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);
    const keptId = await insertSubCalendar(t, connectionId, "work@example.com", "Work");

    await t.withIdentity(ownerIdentity).action(async (ctx) => {
      await service.setEnabledSubCalendars(ctx, connectionId, [
        { externalId: "work@example.com", label: "Work" },
        { externalId: "personal@example.com", label: "Personal" },
      ]);
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    const keptRow = rows.find((r) => r.externalId === "work@example.com");
    expect(keptRow?._id).toBe(keptId);
    expect(rows.map((r) => r.externalId).sort()).toEqual([
      "personal@example.com",
      "work@example.com",
    ]);
  });
});
