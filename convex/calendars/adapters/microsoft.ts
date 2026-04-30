import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SyncWindow,
  WriteError,
} from "@shared/calendars";

export const microsoftCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: true,
  hasSubCalendars: true,
};

export const MicrosoftCalendarAdapter: CalendarProvider = {
  capabilities: microsoftCapabilities,

  async fetchEvents(_window: SyncWindow): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },

  async writeEvent(_event: IncomingEvent): Promise<WriteError | null> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },

  async listSubCalendars(): Promise<Array<{ id: string; label: string }>> {
    throw new Error("Not implemented: Microsoft Calendar is not yet supported");
  },
};
