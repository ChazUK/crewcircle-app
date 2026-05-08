import { describe, expect, test, vi } from "vitest";

import { isCameraPermissionGranted } from "./isCameraPermissionGranted";

vi.mock("expo-image-picker", () => ({
  getCameraPermissionsAsync: vi.fn(),
}));

import * as ImagePicker from "expo-image-picker";

const mockGet = vi.mocked(ImagePicker.getCameraPermissionsAsync);

const makePermission = (status: string) =>
  ({
    status,
    expires: "never",
    granted: status === "granted",
    canAskAgain: status !== "denied",
  }) as never;

describe("isCameraPermissionGranted", () => {
  test("returns true when permission is granted", async () => {
    mockGet.mockResolvedValue(makePermission("granted"));
    const result = await isCameraPermissionGranted();
    expect(result).toBe(true);
  });

  test("returns false when permission is denied", async () => {
    mockGet.mockResolvedValue(makePermission("denied"));
    const result = await isCameraPermissionGranted();
    expect(result).toBe(false);
  });

  test("returns false when status is undetermined", async () => {
    mockGet.mockResolvedValue(makePermission("undetermined"));
    const result = await isCameraPermissionGranted();
    expect(result).toBe(false);
  });
});
