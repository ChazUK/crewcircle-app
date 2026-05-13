import { describe, expect, test } from "vitest";

import { formatContactName } from "./formatContactName";

describe("formatContactName", () => {
  test("returns 'first last' when both present", () => {
    expect(formatContactName({ firstName: "Alice", lastName: "Smith" })).toBe("Alice Smith");
  });

  test("returns first only when last missing", () => {
    expect(formatContactName({ firstName: "Alice", email: "alice@example.com" })).toBe("Alice");
  });

  test("returns last only when first missing", () => {
    expect(formatContactName({ lastName: "Smith", email: "alice@example.com" })).toBe("Smith");
  });

  test("falls back to email local-part when name is missing", () => {
    expect(formatContactName({ email: "alice@example.com" })).toBe("alice");
  });

  test("returns full email if no @ sign", () => {
    expect(formatContactName({ email: "not-an-email" })).toBe("not-an-email");
  });

  test("returns 'Unknown' when nothing usable", () => {
    expect(formatContactName({})).toBe("Unknown");
  });

  test("trims whitespace in names", () => {
    expect(formatContactName({ firstName: "  Alice  ", lastName: " Smith " })).toBe("Alice Smith");
  });
});
