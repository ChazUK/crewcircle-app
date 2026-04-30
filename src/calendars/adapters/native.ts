import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  WriteError,
} from "@shared/calendars";

export const nativeCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: false,
  writable: true,
  hasSubCalendars: true,
};

export const NativeCalendarAdapter: CalendarProvider = {
  capabilities: nativeCapabilities,

  async writeEvent(_event: IncomingEvent): Promise<WriteError | null> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },

  async listSubCalendars(): Promise<Array<{ id: string; label: string }>> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },
};
