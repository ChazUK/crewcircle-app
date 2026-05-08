import { describe, expect, test, vi } from "vitest";

import { isNativeCalendarPermissionGranted } from "./isNativeCalendarPermissionGranted";

vi.mock("expo-calendar", () => ({
  getCalendarPermissionsAsync: vi.fn(),
}));

import * as Calendar from "expo-calendar";

const mockGet = vi.mocked(Calendar.getCalendarPermissionsAsync);

const makePermission = (status: string) =>
  ({
    status,
    expires: "never",
    granted: status === "granted",
    canAskAgain: status !== "denied",
  }) as never;

describe("isNativeCalendarPermissionGranted", () => {
  test("returns true when permission is granted", async () => {
    mockGet.mockResolvedValue(makePermission("granted"));
    const result = await isNativeCalendarPermissionGranted();
    expect(result).toBe(true);
  });

  test("returns false when permission is denied", async () => {
    mockGet.mockResolvedValue(makePermission("denied"));
    const result = await isNativeCalendarPermissionGranted();
    expect(result).toBe(false);
  });

  test("returns false when status is undetermined", async () => {
    mockGet.mockResolvedValue(makePermission("undetermined"));
    const result = await isNativeCalendarPermissionGranted();
    expect(result).toBe(false);
  });
});
