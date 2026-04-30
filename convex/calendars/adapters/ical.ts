import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  SyncWindow,
} from "../orchestrator/types";

export const icalCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: true,
  writable: false,
  hasSubCalendars: false,
};

export const ICalAdapter: CalendarProvider = {
  capabilities: icalCapabilities,

  fetchEvents(_window: SyncWindow): Promise<IncomingEvent[]> {
    throw new Error("Not implemented: ICalAdapter");
  },
};
