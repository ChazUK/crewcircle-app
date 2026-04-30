import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SyncWindow,
  WriteError,
} from "@shared/calendars";

export const googleCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

export const GoogleCalendarAdapter: CalendarProvider = {
  capabilities: googleCapabilities,

  async fetchEvents(_window: SyncWindow): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: GoogleCalendarAdapter");
  },

  async writeEvent(_event: IncomingEvent): Promise<WriteError | null> {
    throw new Error("Not implemented: GoogleCalendarAdapter");
  },

  async listSubCalendars(): Promise<Array<{ id: string; label: string }>> {
    throw new Error("Not implemented: GoogleCalendarAdapter");
  },
};
