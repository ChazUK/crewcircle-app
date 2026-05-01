import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

async function seed() {
  const t = convexTest(schema, modules);
  const owner = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "owner",
      email: "owner@example.com",
      hasCompletedOnboarding: false,
      isPublic: false,
    }),
  );
  const other = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: "other",
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
  return { t, owner, other, connectionId };
}

describe("getConnectionForOwner", () => {
  test("returns the doc when the caller owns it", async () => {
    const { t, owner, connectionId } = await seed();
    const result = await t.query(internal.calendars.actionHelpers.getConnectionForOwner, {
      connectionId,
      userId: owner,
    });
    expect(result?.label).toBe("Mine");
  });

  test("returns null when another user asks", async () => {
    const { t, other, connectionId } = await seed();
    const result = await t.query(internal.calendars.actionHelpers.getConnectionForOwner, {
      connectionId,
      userId: other,
    });
    expect(result).toBeNull();
  });

  test("returns null for a connection that has been deleted", async () => {
    const { t, owner, connectionId } = await seed();
    await t.run((ctx) => ctx.db.delete(connectionId));
    const result = await t.query(internal.calendars.actionHelpers.getConnectionForOwner, {
      connectionId,
      userId: owner,
    });
    expect(result).toBeNull();
  });
});

describe("getConnectionInternal", () => {
  test("returns the doc regardless of owner", async () => {
    const { t, connectionId } = await seed();
    const result = await t.query(internal.calendars.actionHelpers.getConnectionInternal, {
      connectionId,
    });
    expect(result?.label).toBe("Mine");
  });

  test("returns null for a connection that has been deleted", async () => {
    const { t, connectionId } = await seed();
    await t.run((ctx) => ctx.db.delete(connectionId));
    const result = await t.query(internal.calendars.actionHelpers.getConnectionInternal, {
      connectionId,
    });
    expect(result).toBeNull();
  });
});
