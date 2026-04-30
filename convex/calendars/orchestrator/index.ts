import type { AdapterRegistry, SyncWindow } from "@shared/calendars";

export function currentSyncWindow(): SyncWindow {
  return {
    windowStartMs: Date.now() - 30 * 24 * 60 * 60 * 1000,
    windowEndMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
  };
}

export function createCalendarOrchestrator(_adapters: AdapterRegistry) {
  return {
    syncConnection(_connectionId: string): Promise<void> {
      throw new Error("Not implemented: orchestrator");
    },
    syncNewConnection(_connectionId: string): Promise<void> {
      throw new Error("Not implemented: orchestrator");
    },
    addToCalendar(_event: unknown): Promise<void> {
      throw new Error("Not implemented: orchestrator");
    },
  };
}
