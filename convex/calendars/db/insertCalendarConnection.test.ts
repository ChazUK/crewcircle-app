/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";
import { encryptJson } from "../domain/crypto";

const modules = import.meta.glob("/convex/**/*.ts");

const TEST_KEY = btoa(String.fromCharCode(...new Array(32).fill(1)));

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

describe("insertCalendarConnection", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("inserts the connection row with service-owned and blueprint fields merged", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");

    const connectionId = await t.mutation(
      internal.calendars.db.insertCalendarConnection.insertCalendarConnection,
      {
        userId,
        provider: "ical",
        label: "Family iCloud",
        color: "#6366f1",
        blueprint: { icalUrl: encryptedUrl },
        subCalendars: [],
      },
    );

    const row = await t.run((ctx) =>
      ctx.db
        .query("calendarConnections")
        .withIndex("byUser", (q) => q.eq("userId", userId))
        .unique(),
    );
    expect(row?._id).toBe(connectionId);
    expect(row).toMatchObject({
      userId,
      provider: "ical",
      label: "Family iCloud",
      color: "#6366f1",
      syncErrorCount: 0,
    });
    expect(row?.icalUrl).toBeInstanceOf(ArrayBuffer);
    expect(row?.createdAt).toBeTypeOf("number");
  });

  test("inserts every sub-calendar in the blueprint with the new connectionId", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");

    const connectionId = await t.mutation(
      internal.calendars.db.insertCalendarConnection.insertCalendarConnection,
      {
        userId,
        provider: "google",
        label: "Work",
        color: "#10b981",
        blueprint: { externalAccountId: "work@example.com" },
        subCalendars: [
          { externalId: "primary", label: "Primary", showAsBusy: true },
          { externalId: "side", label: "Side projects", showAsBusy: false },
        ],
      },
    );

    const subs = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(subs.map((s) => s.externalId).sort()).toEqual(["primary", "side"]);
    expect(subs.find((s) => s.externalId === "side")?.showAsBusy).toBe(false);
    expect(subs.every((s) => s.connectionId === connectionId)).toBe(true);
  });

  test("rejects a second connection with the same provider + externalAccountId for the same user", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId,
      provider: "google",
      label: "Work",
      color: "#10b981",
      blueprint: { externalAccountId: "work@example.com" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId,
        provider: "google",
        label: "Work (again)",
        color: "#6366f1",
        blueprint: { externalAccountId: "work@example.com" },
        subCalendars: [],
      }),
    ).rejects.toThrow(/CALENDAR_ACCOUNT_ALREADY_CONNECTED/);
  });

  test("allows the same externalAccountId across different providers for the same user", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId,
      provider: "google",
      label: "Google",
      color: "#10b981",
      blueprint: { externalAccountId: "work@example.com" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId,
        provider: "microsoft",
        label: "Microsoft",
        color: "#0078d4",
        blueprint: { externalAccountId: "work@example.com" },
        subCalendars: [],
      }),
    ).resolves.toBeDefined();
  });

  test("allows the same provider + externalAccountId across different users", async () => {
    const t = convexTest(schema, modules);
    const userA = await insertUser(t, "userA");
    const userB = await insertUser(t, "userB");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId: userA,
      provider: "google",
      label: "Work",
      color: "#10b981",
      blueprint: { externalAccountId: "shared@example.com" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId: userB,
        provider: "google",
        label: "Work",
        color: "#10b981",
        blueprint: { externalAccountId: "shared@example.com" },
        subCalendars: [],
      }),
    ).resolves.toBeDefined();
  });

  test("allows a second iCal connection when neither carries a hash", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId,
      provider: "ical",
      label: "Family",
      color: "#6366f1",
      blueprint: { icalUrl: encryptedUrl },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId,
        provider: "ical",
        label: "Other",
        color: "#10b981",
        blueprint: { icalUrl: encryptedUrl },
        subCalendars: [],
      }),
    ).resolves.toBeDefined();
  });

  test("rejects a second iCal connection with the same icalUrlHash for the same user", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId,
      provider: "ical",
      label: "Family",
      color: "#6366f1",
      blueprint: { icalUrl: encryptedUrl, icalUrlHash: "deadbeef" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId,
        provider: "ical",
        label: "Same again",
        color: "#10b981",
        blueprint: { icalUrl: encryptedUrl, icalUrlHash: "deadbeef" },
        subCalendars: [],
      }),
    ).rejects.toThrow(/CALENDAR_ICAL_URL_ALREADY_CONNECTED/);
  });

  test("allows the same icalUrlHash across different users", async () => {
    const t = convexTest(schema, modules);
    const userA = await insertUser(t, "userA");
    const userB = await insertUser(t, "userB");
    const encryptedUrl = await encryptJson("https://example.com/cal.ics");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId: userA,
      provider: "ical",
      label: "Family",
      color: "#6366f1",
      blueprint: { icalUrl: encryptedUrl, icalUrlHash: "deadbeef" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId: userB,
        provider: "ical",
        label: "Family",
        color: "#10b981",
        blueprint: { icalUrl: encryptedUrl, icalUrlHash: "deadbeef" },
        subCalendars: [],
      }),
    ).resolves.toBeDefined();
  });

  test("rejects a second native connection for the same user", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId,
      provider: "native",
      label: "Phone",
      color: "#f59e0b",
      blueprint: { localCalendarId: "" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId,
        provider: "native",
        label: "Phone again",
        color: "#10b981",
        blueprint: { localCalendarId: "" },
        subCalendars: [],
      }),
    ).rejects.toThrow(/CALENDAR_NATIVE_ALREADY_CONNECTED/);
  });

  test("allows a native connection for one user when another user already has one", async () => {
    const t = convexTest(schema, modules);
    const userA = await insertUser(t, "userA");
    const userB = await insertUser(t, "userB");

    await t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
      userId: userA,
      provider: "native",
      label: "Phone",
      color: "#f59e0b",
      blueprint: { localCalendarId: "" },
      subCalendars: [],
    });

    await expect(
      t.mutation(internal.calendars.db.insertCalendarConnection.insertCalendarConnection, {
        userId: userB,
        provider: "native",
        label: "Phone",
        color: "#10b981",
        blueprint: { localCalendarId: "" },
        subCalendars: [],
      }),
    ).resolves.toBeDefined();
  });

  test("inserts no sub-calendars when the blueprint has none", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "user1");

    const connectionId = await t.mutation(
      internal.calendars.db.insertCalendarConnection.insertCalendarConnection,
      {
        userId,
        provider: "native",
        label: "Phone",
        color: "#f59e0b",
        blueprint: { localCalendarId: "device-cal-1" },
        subCalendars: [],
      },
    );

    const subs = await t.run((ctx) =>
      ctx.db
        .query("calendarSubCalendars")
        .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
        .collect(),
    );
    expect(subs).toEqual([]);
  });
});
