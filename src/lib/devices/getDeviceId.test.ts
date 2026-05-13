import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("expo-application", () => ({
  getIosIdForVendorAsync: vi.fn(),
  getAndroidId: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import * as Application from "expo-application";
import { Platform } from "react-native";

import { getDeviceId } from "./getDeviceId";

const mockIdfv = vi.mocked(Application.getIosIdForVendorAsync);
const mockAndroidId = vi.mocked(Application.getAndroidId);

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  (Platform as { OS: string }).OS = "ios";
});

describe("getDeviceId", () => {
  test("returns IDFV + ios on iOS", async () => {
    (Platform as { OS: string }).OS = "ios";
    mockIdfv.mockResolvedValue("idfv-1234");
    const result = await getDeviceId();
    expect(result).toEqual({ deviceId: "idfv-1234", platform: "ios" });
  });

  test("returns ANDROID_ID + android on Android", async () => {
    (Platform as { OS: string }).OS = "android";
    mockAndroidId.mockReturnValue("android-abcd");
    const result = await getDeviceId();
    expect(result).toEqual({ deviceId: "android-abcd", platform: "android" });
  });

  test("returns null when IDFV is unavailable", async () => {
    (Platform as { OS: string }).OS = "ios";
    mockIdfv.mockResolvedValue(null);
    const result = await getDeviceId();
    expect(result).toBeNull();
  });

  test("returns null on unsupported platforms", async () => {
    (Platform as { OS: string }).OS = "web";
    const result = await getDeviceId();
    expect(result).toBeNull();
  });
});
