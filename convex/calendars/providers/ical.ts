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

export const icalCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: false,
  hasSubCalendars: false,
};

// iCal feeds are opaque single-source — every event maps to one synthetic
// Sub-Calendar. The constant externalId reflects that there is no
// provider-side calendar identifier to track.
export const ICAL_SYNTHETIC_SUB_CALENDAR_EXTERNAL_ID = "default";

export const ICalProvider: CalendarProvider = {
  capabilities: icalCapabilities,

  // Returns the connection blueprint plus the synthetic Sub-Calendar
  // every iCal Calendar Connection needs. The service inserts both in a
  // single mutation, so a partially-installed iCal connection is
  // unrepresentable.
  async connect(
    _ctx: unknown,
    params: CalendarConnectParams,
    _context: CalendarConnectContext,
  ): Promise<CalendarConnectResult> {
    if (params.provider !== "ical") {
      throw new Error("ICalProvider.connect called with non-iCal params");
    }
    return {
      connection: {
        icalUrl: params.url,
      },
      subCalendars: [
        {
          externalId: ICAL_SYNTHETIC_SUB_CALENDAR_EXTERNAL_ID,
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
