import type {
  CalendarConnectContext,
  CalendarConnectParams,
  CalendarConnectResult,
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  SyncWindow,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";

export const microsoftCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

export const MicrosoftCalendarProvider: CalendarProvider = {
  capabilities: microsoftCapabilities,

  async connect(
    _ctx: unknown,
    _params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    throw new Error("Not implemented: Microsoft Calendar connect");
  },

  async fetchEvents(
    _ctx: unknown,
    _connection: unknown,
    _window: SyncWindow,
  ): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },
};
