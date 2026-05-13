import { useEffect, useState } from "react";

import type { DeviceIdentity } from "@/lib/devices/getDeviceId";
import { getDeviceId } from "@/lib/devices/getDeviceId";

// Resolves the current device's stable identifier once on mount and
// caches it for the lifetime of the component. The identifier never
// changes for a given install, so there's no reason to refetch.
export function useCurrentDeviceId(): DeviceIdentity | null {
  const [device, setDevice] = useState<DeviceIdentity | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDeviceId().then((value) => {
      if (!cancelled) setDevice(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return device;
}
