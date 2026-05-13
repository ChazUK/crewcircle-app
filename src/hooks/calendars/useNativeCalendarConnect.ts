import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { SubCalendar } from "@shared/calendars";
import { useAction } from "convex/react";
import { useCallback } from "react";

import { listNativeSubCalendars } from "@/lib/calendars/listNativeSubCalendars";
import { requestNativeCalendarPermission } from "@/lib/calendars/requestNativeCalendarPermission";
import { getDeviceId } from "@/lib/devices/getDeviceId";

export type NativeConnectResult =
  | {
      ok: true;
      connectionId: Id<"calendarConnections">;
      color: string;
      subCalendars: SubCalendar[];
      currentExternalIds: string[];
    }
  | { ok: false; permissionDenied: true }
  | { ok: false; permissionDenied: false; error: string };

export function useNativeCalendarConnect() {
  const connectNative = useAction(api.calendars.actions.connectNative);

  return useCallback(async (): Promise<NativeConnectResult> => {
    const permission = await requestNativeCalendarPermission();
    if (permission === "denied") {
      return { ok: false, permissionDenied: true };
    }

    const device = await getDeviceId();
    if (!device) {
      return {
        ok: false,
        permissionDenied: false,
        error: "Could not identify this device",
      };
    }

    try {
      const [result, subCalendars] = await Promise.all([
        connectNative({
          label: "Device Calendar",
          deviceId: device.deviceId,
          devicePlatform: device.platform,
        }),
        listNativeSubCalendars(),
      ]);
      return {
        ok: true,
        connectionId: result.connectionId,
        color: result.color,
        subCalendars,
        currentExternalIds: result.currentExternalIds,
      };
    } catch (err) {
      return {
        ok: false,
        permissionDenied: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }, [connectNative]);
}
