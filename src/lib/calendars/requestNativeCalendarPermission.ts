import * as Calendar from "expo-calendar";

export async function requestNativeCalendarPermission(): Promise<"granted" | "denied"> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}
