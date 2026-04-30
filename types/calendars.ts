export type IncomingEvent = {
  externalId: string;
  subCalendarId?: string;
  uid?: string;
  recurrenceId?: number;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
};

export type CalendarProviderCapabilities = {
  serverSidePullable: boolean;
  writable: boolean;
  hasSubCalendars: boolean;
};

export type SyncWindow = {
  windowStartMs: number;
  windowEndMs: number;
};

export type SyncError =
  | { kind: "network"; message: string }
  | { kind: "auth"; message: string }
  | { kind: "parse"; message: string }
  | { kind: "unknown"; message: string };

export type WriteError =
  | { kind: "not_supported"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "unknown"; message: string };

export interface CalendarProvider {
  capabilities: CalendarProviderCapabilities;
  fetchEvents?(window: SyncWindow): Promise<IncomingEvent[]>;
  writeEvent?(event: IncomingEvent): Promise<WriteError | null>;
  listSubCalendars?(): Promise<Array<{ id: string; label: string }>>;
}

export type AdapterRegistry = {
  google: CalendarProvider;
  ical: CalendarProvider;
  native: CalendarProvider;
  microsoft?: CalendarProvider;
};
