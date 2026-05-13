import type { CalendarDevicePlatform } from "@shared/calendars";
import * as Application from "expo-application";
import { Platform } from "react-native";

export type DeviceIdentity = {
  deviceId: string;
  platform: CalendarDevicePlatform;
};

// Returns a stable per-install identifier for the current device, paired
// with the platform. iOS uses identifierForVendor (IDFV) which survives
// app updates and only resets when every app from the same vendor is
// removed. Android uses Settings.Secure.ANDROID_ID which is scoped per
// signing key + user since Android 8 and only resets on factory reset.
// Neither identifier requires a permission prompt.
//
// Returns null on unsupported platforms (web, server) and when IDFV is
// transiently unavailable on iOS — callers should treat that as "we
// can't device-lock right now, try again later".
export async function getDeviceId(): Promise<DeviceIdentity | null> {
  if (Platform.OS === "ios") {
    const id = await Application.getIosIdForVendorAsync();
    if (!id) return null;
    return { deviceId: id, platform: "ios" };
  }
  if (Platform.OS === "android") {
    const id = Application.getAndroidId();
    if (!id) return null;
    return { deviceId: id, platform: "android" };
  }
  return null;
}
