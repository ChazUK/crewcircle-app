import { describe, expect, test, vi } from "vitest";

import { requestNativeCalendarPermission } from "./requestNativeCalendarPermission";

vi.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: vi.fn(),
}));

import * as Calendar from "expo-calendar";

const mockRequest = vi.mocked(Calendar.requestCalendarPermissionsAsync);

const makePermission = (status: string) =>
  ({
    status,
    expires: "never",
    granted: status === "granted",
    canAskAgain: status !== "denied",
  }) as never;

describe("requestNativeCalendarPermission", () => {
  test("returns granted when permission is granted", async () => {
    mockRequest.mockResolvedValue(makePermission("granted"));
    const result = await requestNativeCalendarPermission();
    expect(result).toBe("granted");
  });

  test("returns denied when permission is denied", async () => {
    mockRequest.mockResolvedValue(makePermission("denied"));
    const result = await requestNativeCalendarPermission();
    expect(result).toBe("denied");
  });

  test("returns denied when status is undetermined", async () => {
    mockRequest.mockResolvedValue(makePermission("undetermined"));
    const result = await requestNativeCalendarPermission();
    expect(result).toBe("denied");
  });
});
