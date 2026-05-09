import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useState } from "react";

export function useDisconnectCalendar() {
  const [pendingId, setPendingId] = useState<Id<"calendarConnections"> | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disconnectAction = useAction(api.calendars.actions.disconnect);

  const requestDisconnect = (id: Id<"calendarConnections">) => {
    setError(null);
    setPendingId(id);
  };

  const confirm = async () => {
    if (!pendingId) return;
    setIsDisconnecting(true);
    setError(null);
    try {
      await disconnectAction({ connectionId: pendingId });
      setPendingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const cancel = () => {
    if (isDisconnecting) return;
    setPendingId(null);
    setError(null);
  };

  return { pendingId, isDisconnecting, error, requestDisconnect, confirm, cancel };
}
