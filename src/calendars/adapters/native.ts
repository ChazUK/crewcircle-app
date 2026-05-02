import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";

export const nativeCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: false,
  writable: true,
  hasSubCalendars: true,
};

export const NativeCalendarAdapter: CalendarProvider = {
  capabilities: nativeCapabilities,

  async connect(
    _ctx: unknown,
    _params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },
};
