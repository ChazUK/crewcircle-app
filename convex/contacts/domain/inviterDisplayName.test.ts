import { describe, expect, test } from "vitest";

import type { Doc } from "../../_generated/dataModel";
import { inviterDisplayName } from "./inviterDisplayName";

const baseUser = (overrides: Partial<Doc<"users">> = {}): Doc<"users"> =>
  ({
    _id: "u1" as Doc<"users">["_id"],
    _creationTime: 0,
    email: "user@example.com",
    externalAuthId: "ext_1",
    hasCompletedOnboarding: true,
    ...overrides,
  }) as Doc<"users">;

describe("inviterDisplayName", () => {
  test("returns first and last name when both present", () => {
    expect(inviterDisplayName(baseUser({ firstName: "Jane", lastName: "Doe" }))).toBe("Jane Doe");
  });

  test("returns first name only when last name missing", () => {
    expect(inviterDisplayName(baseUser({ firstName: "Jane" }))).toBe("Jane");
  });

  test("returns last name only when first name missing", () => {
    expect(inviterDisplayName(baseUser({ lastName: "Doe" }))).toBe("Doe");
  });

  test("falls back to email when no name set", () => {
    expect(inviterDisplayName(baseUser({ email: "fallback@example.com" }))).toBe(
      "fallback@example.com",
    );
  });

  test("trims whitespace", () => {
    expect(inviterDisplayName(baseUser({ firstName: "  Jane ", lastName: " Doe  " }))).toBe(
      "Jane Doe",
    );
  });

  test("falls back to email when names are blank strings", () => {
    expect(
      inviterDisplayName(baseUser({ firstName: "   ", lastName: "", email: "blank@example.com" })),
    ).toBe("blank@example.com");
  });
});
