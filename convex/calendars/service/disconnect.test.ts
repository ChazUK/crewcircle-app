import type {
  CalendarConnectContext,
  CalendarConnectParams,
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
  ): Promise<string> {
    throw new Error("not used by disconnect");
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
      provider: "ical",
      label: "Mine",
      createdAt: Date.now(),
      color: "#6366f1",
      syncErrorCount: 0,
    }),
  );
  return { owner, other, connectionId };
}

async function insertEvent(
  t: TestConvex<typeof schema>,
  userId: Id<"users">,
  connectionId: Id<"calendarConnections">,
  externalId: string,
) {
  const subCalendarId = await t.run((ctx) =>
    ctx.db.insert("calendarSubCalendars", {
      connectionId,
      externalId: "default",
      label: "Default",
      showAsBusy: true,
    }),
  );
  await t.run((ctx) =>
    ctx.db.insert("calendarEvents", {
      userId,
      connectionId,
      subCalendarId,
      externalId,
      title: externalId,
      startsAt: Date.now(),
      endsAt: Date.now() + 60_000,
      isAllDay: false,
      updatedAt: Date.now(),
    }),
  );
}

describe("CalendarService.disconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("deletes the connection and its events when the caller owns it", async () => {
    const t = convexTest(schema, modules);
    const { owner, connectionId } = await seed(t);
    await insertEvent(t, owner, connectionId, "evt-1");
    await insertEvent(t, owner, connectionId, "evt-2");

    await t.withIdentity(ownerIdentity).action(async (ctx) => {
      await service.disconnect(ctx, connectionId);
    });
    // disconnect schedules cascadeDelete; let the scheduled chain drain.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const remainingConnection = await t.run((ctx) => ctx.db.get(connectionId));
    const remainingEvents = await t.run((ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(remainingConnection).toBeNull();
    expect(remainingEvents).toEqual([]);
  });

  test("throws when the caller is not the owner", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await expect(
      t.withIdentity(otherIdentity).action(async (ctx) => {
        await service.disconnect(ctx, connectionId);
      }),
    ).rejects.toThrow(/not found/i);

    const stillThere = await t.run((ctx) => ctx.db.get(connectionId));
    expect(stillThere).not.toBeNull();
  });

  test("throws when the connection does not exist", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);
    await t.run((ctx) => ctx.db.delete(connectionId));

    await expect(
      t.withIdentity(ownerIdentity).action(async (ctx) => {
        await service.disconnect(ctx, connectionId);
      }),
    ).rejects.toThrow(/not found/i);
  });

  test("throws when the caller is not authenticated", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await expect(
      t.action(async (ctx) => {
        await service.disconnect(ctx, connectionId);
      }),
    ).rejects.toThrow(/not authenticated/i);
  });

  test("throws when the authenticated identity has no matching user record", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await seed(t);

    await expect(
      t
        .withIdentity({
          subject: "ghost_clerk",
          issuer: "https://example.clerk.test",
          tokenIdentifier: "https://example.clerk.test|ghost_clerk",
        })
        .action(async (ctx) => {
          await service.disconnect(ctx, connectionId);
        }),
    ).rejects.toThrow();
  });
});
