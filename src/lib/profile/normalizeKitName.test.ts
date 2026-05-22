import { describe, expect, test } from "vitest";

import { normalizeKitName } from "./normalizeKitName";

describe("normalizeKitName", () => {
  test("lowercases", () => {
    expect(normalizeKitName("Arri Alexa Mini")).toBe("arri alexa mini");
  });

  test("trims leading and trailing whitespace", () => {
    expect(normalizeKitName("  Arri Alexa Mini  ")).toBe("arri alexa mini");
  });

  test("collapses multiple internal spaces", () => {
    expect(normalizeKitName("Arri   Alexa    Mini")).toBe("arri alexa mini");
  });

  test("handles mixed whitespace, casing, and spacing", () => {
    expect(normalizeKitName("  ARRI   alexa   MINI  ")).toBe("arri alexa mini");
  });
});
