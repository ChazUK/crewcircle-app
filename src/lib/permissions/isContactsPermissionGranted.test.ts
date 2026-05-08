import { describe, expect, test, vi } from "vitest";

import { isContactsPermissionGranted } from "./isContactsPermissionGranted";

vi.mock("expo-contacts", () => ({
  getPermissionsAsync: vi.fn(),
}));

import * as Contacts from "expo-contacts";

const mockGet = vi.mocked(Contacts.getPermissionsAsync);

const makePermission = (status: string) =>
  ({
    status,
    expires: "never",
    granted: status === "granted",
    canAskAgain: status !== "denied",
  }) as never;

describe("isContactsPermissionGranted", () => {
  test("returns true when permission is granted", async () => {
    mockGet.mockResolvedValue(makePermission("granted"));
    const result = await isContactsPermissionGranted();
    expect(result).toBe(true);
  });

  test("returns false when permission is denied", async () => {
    mockGet.mockResolvedValue(makePermission("denied"));
    const result = await isContactsPermissionGranted();
    expect(result).toBe(false);
  });

  test("returns false when status is undetermined", async () => {
    mockGet.mockResolvedValue(makePermission("undetermined"));
    const result = await isContactsPermissionGranted();
    expect(result).toBe(false);
  });
});
