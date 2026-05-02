import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderRegistry,
  IncomingEvent,
  SubCalendar,
  SyncWindow,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";
import { describe, expect, test, vi } from "vitest";

import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { createCalendarService } from "./index";

const userId = "user-1" as Id<"users">;
const connectionId = "conn-1" as Id<"calendarConnections">;

const userDoc = {
  _id: userId,
  _creationTime: 0,
  externalAuthId: "clerk_user_42",
  email: "owner@example.com",
  hasCompletedOnboarding: true,
  isPublic: false,
} as Doc<"users">;

const googleConnection = {
  _id: connectionId,
  _creationTime: 0,
  userId,
  provider: "google",
  label: "Work",
  color: "#6366f1",
  createdAt: 0,
  syncErrorCount: 0,
} as Doc<"calendarConnections">;

const icalConnection = { ...googleConnection, provider: "ical" } as Doc<"calendarConnections">;

const workCalendar: SubCalendar = { id: "work@example.com", label: "Work", primary: true };
const birthdayCalendar: SubCalendar = {
  id: "addressbook#contacts@group.v.calendar.google.com",
  label: "Birthdays",
  primary: false,
};

function makeProvider(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    capabilities: {
      serverSidePullable: true,
      writable: true,
      hasSubCalendars: true,
    },
    async connect(
      _ctx: unknown,
      _params: CalendarConnectParams,
      _context: CalendarConnectContext,
    ): Promise<CalendarConnectResult> {
      throw new Error("not used");
    },
    async fetchEvents(
      _ctx: unknown,
      _connection: unknown,
      _window: SyncWindow,
    ): Promise<IncomingEvent[]> {
      return [];
    },
    async writeEvent(
      _ctx: unknown,
      _connection: unknown,
      _event: IncomingEvent,
    ): Promise<WriteSuccess | WriteError> {
      return { kind: "not_supported", message: "not used" };
    },
    ...overrides,
  };
}

function makeRegistry(overrides: Partial<CalendarProviderRegistry> = {}): CalendarProviderRegistry {
  return {
    google: makeProvider(),
    ical: makeProvider(),
    microsoft: makeProvider(),
    native: makeProvider(),
    ...overrides,
  };
}

function makeCtx({
  identity = { subject: "clerk_user_42" } as unknown as Awaited<
    ReturnType<ActionCtx["auth"]["getUserIdentity"]>
  >,
  user = userDoc as Doc<"users"> | null,
  connection = googleConnection as Doc<"calendarConnections"> | null,
}: {
  identity?: Awaited<ReturnType<ActionCtx["auth"]["getUserIdentity"]>> | null;
  user?: Doc<"users"> | null;
  connection?: Doc<"calendarConnections"> | null;
} = {}) {
  const runQuery = vi.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(connection);
  const ctx = {
    auth: { getUserIdentity: vi.fn().mockResolvedValue(identity) },
    runQuery,
  } as unknown as ActionCtx;
  return { ctx, runQuery };
}

describe("CalendarService.listSubCalendars", () => {
  test("throws when the caller is unauthenticated", async () => {
    const service = createCalendarService(makeRegistry());
    const { ctx } = makeCtx({ identity: null });
    await expect(service.listSubCalendars(ctx, connectionId)).rejects.toThrow("Not authenticated");
  });

  test("throws when no user row is found for the identity", async () => {
    const service = createCalendarService(makeRegistry());
    const { ctx } = makeCtx({ user: null });
    await expect(service.listSubCalendars(ctx, connectionId)).rejects.toThrow("User not found");
  });

  test("throws when the connection is not owned by the caller", async () => {
    const service = createCalendarService(makeRegistry());
    const { ctx } = makeCtx({ connection: null });
    await expect(service.listSubCalendars(ctx, connectionId)).rejects.toThrow(
      "Connection not found",
    );
  });

  test("returns an empty array when the provider does not implement listSubCalendars", async () => {
    const provider = makeProvider();
    delete provider.listSubCalendars;
    const service = createCalendarService(makeRegistry({ google: provider }));
    const { ctx } = makeCtx();
    await expect(service.listSubCalendars(ctx, connectionId)).resolves.toEqual([]);
  });

  test("returns an empty array for an iCal connection (synthetic sub-calendar)", async () => {
    const provider = makeProvider();
    delete provider.listSubCalendars;
    const service = createCalendarService(makeRegistry({ ical: provider }));
    const { ctx } = makeCtx({ connection: icalConnection });
    await expect(service.listSubCalendars(ctx, connectionId)).resolves.toEqual([]);
  });

  test("calls the provider with the action context and the resolved connection", async () => {
    const listSubCalendars = vi.fn<CalendarProvider["listSubCalendars"] & object>(async () => [
      workCalendar,
    ]);
    const provider = makeProvider({ listSubCalendars });
    const service = createCalendarService(makeRegistry({ google: provider }));
    const { ctx } = makeCtx();
    await service.listSubCalendars(ctx, connectionId);
    expect(listSubCalendars).toHaveBeenCalledTimes(1);
    expect(listSubCalendars).toHaveBeenCalledWith(ctx, googleConnection);
  });

  test("filters birthday and holiday sub-calendars before returning", async () => {
    const provider = makeProvider({
      listSubCalendars: vi.fn(async () => [workCalendar, birthdayCalendar]),
    });
    const service = createCalendarService(makeRegistry({ google: provider }));
    const { ctx } = makeCtx();
    const result = await service.listSubCalendars(ctx, connectionId);
    expect(result).toEqual([workCalendar]);
  });

  test("verifies ownership by passing the resolved userId to getConnectionForOwner", async () => {
    const provider = makeProvider({ listSubCalendars: vi.fn(async () => []) });
    const service = createCalendarService(makeRegistry({ google: provider }));
    const { ctx, runQuery } = makeCtx();
    await service.listSubCalendars(ctx, connectionId);
    const ownerCheckCall = runQuery.mock.calls[1];
    expect(ownerCheckCall[1]).toEqual({ connectionId, userId });
  });
});
