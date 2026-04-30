import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SyncWindow,
  WriteError,
} from "../orchestrator/types";

export const googleCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

export const GoogleCalendarAdapter: CalendarProvider = {
  capabilities: googleCapabilities,

  fetchEvents(_window: SyncWindow): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: GoogleCalendarAdapter");
  },

  writeEvent(_event: IncomingEvent): Promise<WriteError | null> {
    throw new Error("Not implemented: GoogleCalendarAdapter");
  },

  listSubCalendars(): Promise<Array<{ id: string; label: string }>> {
    throw new Error("Not implemented: GoogleCalendarAdapter");
  },
};
