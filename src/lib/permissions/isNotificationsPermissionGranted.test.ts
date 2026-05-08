import { describe, expect, test, vi } from "vitest";

import { isNotificationsPermissionGranted } from "./isNotificationsPermissionGranted";

vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn(),
}));

import * as Notifications from "expo-notifications";

const mockGet = vi.mocked(Notifications.getPermissionsAsync);

const makePermission = (status: string) =>
  ({
    status,
    expires: "never",
    granted: status === "granted",
    canAskAgain: status !== "denied",
  }) as never;

describe("isNotificationsPermissionGranted", () => {
  test("returns true when permission is granted", async () => {
    mockGet.mockResolvedValue(makePermission("granted"));
    const result = await isNotificationsPermissionGranted();
    expect(result).toBe(true);
  });

  test("returns false when permission is denied", async () => {
    mockGet.mockResolvedValue(makePermission("denied"));
    const result = await isNotificationsPermissionGranted();
    expect(result).toBe(false);
  });

  test("returns false when status is undetermined", async () => {
    mockGet.mockResolvedValue(makePermission("undetermined"));
    const result = await isNotificationsPermissionGranted();
    expect(result).toBe(false);
  });
});
