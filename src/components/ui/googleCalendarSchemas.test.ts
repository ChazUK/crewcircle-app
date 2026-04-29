import { describe, expect, test } from "vitest";

import { GoogleCalendarItemSchema, GoogleCalendarListSchema } from "./googleCalendarSchemas";

describe("GoogleCalendarItemSchema", () => {
  test("accepts a valid item with all fields", () => {
    const result = GoogleCalendarItemSchema.safeParse({
      id: "user@gmail.com",
      label: "My Calendar",
      primary: true,
      accessRole: "owner",
      backgroundColor: "#4285F4",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user@gmail.com");
      expect(result.data.primary).toBe(true);
    }
  });

  test("accepts a valid item with only required fields", () => {
    const result = GoogleCalendarItemSchema.safeParse({
      id: "cal123",
      label: "Work",
      primary: false,
    });
    expect(result.success).toBe(true);
  });

  test("rejects an item missing id", () => {
    const result = GoogleCalendarItemSchema.safeParse({
      label: "Work",
      primary: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects an item missing label", () => {
    const result = GoogleCalendarItemSchema.safeParse({
      id: "cal123",
      primary: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects an item with wrong type for primary", () => {
    const result = GoogleCalendarItemSchema.safeParse({
      id: "cal123",
      label: "Work",
      primary: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("GoogleCalendarListSchema", () => {
  test("accepts an array of valid items", () => {
    const result = GoogleCalendarListSchema.safeParse([
      { id: "primary@gmail.com", label: "Primary", primary: true, accessRole: "owner" },
      { id: "other@group.calendar.google.com", label: "Shared", primary: false },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test("accepts an empty array", () => {
    const result = GoogleCalendarListSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  test("rejects a non-array value", () => {
    const result = GoogleCalendarListSchema.safeParse({ id: "x", label: "X", primary: false });
    expect(result.success).toBe(false);
  });

  test("rejects an array containing an invalid item", () => {
    const result = GoogleCalendarListSchema.safeParse([
      { id: "good", label: "Good", primary: false },
      { label: "Missing id", primary: true },
    ]);
    expect(result.success).toBe(false);
  });

  test("rejects a null response", () => {
    const result = GoogleCalendarListSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  test("rejects an error-shaped API response object", () => {
    const result = GoogleCalendarListSchema.safeParse({
      error: { code: 401, message: "Unauthorized" },
    });
    expect(result.success).toBe(false);
  });
});
