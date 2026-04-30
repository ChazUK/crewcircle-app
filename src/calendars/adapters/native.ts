import type {
  CalendarProvider,
  CalendarProviderCapabilities,
  IncomingEvent,
  WriteError,
} from "@convex/calendars/orchestrator/types";

export const nativeCapabilities: CalendarProviderCapabilities = {
  serverSidePullable: false,
  writable: true,
  hasSubCalendars: true,
};

export const NativeCalendarAdapter: CalendarProvider = {
  capabilities: nativeCapabilities,

  writeEvent(_event: IncomingEvent): Promise<WriteError | null> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },

  listSubCalendars(): Promise<Array<{ id: string; label: string }>> {
    throw new Error("Not implemented: NativeCalendarAdapter");
  },
};
