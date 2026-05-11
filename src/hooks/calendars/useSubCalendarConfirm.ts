import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useCallback } from "react";

export function useSubCalendarConfirm(connectionId: Id<"calendarConnections"> | null) {
  const setEnabled = useAction(api.calendars.actions.setEnabledSubCalendars);

  return useCallback(
    async (selected: { externalId: string; label: string; color?: string }[]) => {
      if (!connectionId) return;
      await setEnabled({ connectionId, selections: selected });
    },
    [connectionId, setEnabled],
  );
}
