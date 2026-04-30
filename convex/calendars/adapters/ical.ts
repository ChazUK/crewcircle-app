import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SyncWindow,
} from "@shared/calendars";

export const icalCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: false,
  hasSubCalendars: false,
};

export const ICalAdapter: CalendarProvider = {
  capabilities: icalCapabilities,

  async fetchEvents(_window: SyncWindow): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: ICalAdapter");
  },
};
