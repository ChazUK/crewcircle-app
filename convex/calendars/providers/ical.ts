import type {
  CalendarConnectParams,
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SubCalendar,
  SyncWindow,
  WriteError,
  WriteSuccess,
} from "@shared/calendars";

export const icalCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: false,
  hasSubCalendars: false,
};

export const ICalProvider: CalendarProvider = {
  capabilities: icalCapabilities,

  async connect(_ctx: unknown, _params: CalendarConnectParams): Promise<void> {
    throw new Error("Not implemented: iCal Calendar connect");
  },

  async fetchEvents(
    _ctx: unknown,
    _connection: unknown,
    _window: SyncWindow,
  ): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: iCal Calendar is not yet supported");
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Not implemented: iCal Calendar is not yet supported");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    throw new Error("Not implemented: iCal Calendar is not yet supported");
  },
};
