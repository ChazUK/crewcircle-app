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

export const nativeCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: false,
  writable: false,
  hasSubCalendars: true,
};

export const NativeCalendarProvider: CalendarProvider = {
  capabilities: nativeCapabilities,

  async connect(
    _ctx: unknown,
    params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    if (params.provider !== "native") {
      throw new Error("NativeCalendarProvider.connect called with non-native params");
    }
    return {
      connection: {
        localCalendarId: params.deviceCalendarId,
      },
      subCalendars: [
        {
          externalId: params.deviceCalendarId,
          label: params.label,
          showAsBusy: true,
        },
      ],
    };
  },

  async fetchEvents(
    _ctx: unknown,
    _connection: unknown,
    _window: SyncWindow,
  ): Promise<IncomingEvent[]> {
    throw new Error("Native provider cannot be called server-side");
  },

  async writeEvent(
    _ctx: unknown,
    _connection: unknown,
    _event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError> {
    throw new Error("Native provider cannot be called server-side");
  },

  async listSubCalendars(_ctx: unknown, _connection: unknown): Promise<SubCalendar[]> {
    throw new Error("Native provider cannot be called server-side");
  },
};
