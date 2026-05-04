import { describe, expect, test } from "vitest";

import { normalizeICalUrl } from "./normalizeICalUrl";

describe("normalizeICalUrl", () => {
  test("rewrites webcal:// to https://", () => {
    expect(normalizeICalUrl("webcal://example.com/feed.ics")).toBe("https://example.com/feed.ics");
  });

  test("rewrites webcals:// to https://", () => {
    expect(normalizeICalUrl("webcals://example.com/feed.ics")).toBe("https://example.com/feed.ics");
  });

  test("treats the scheme prefix case-insensitively", () => {
    expect(normalizeICalUrl("WEBCAL://example.com/feed.ics")).toBe("https://example.com/feed.ics");
  });

  test("leaves https:// URLs unchanged", () => {
    expect(normalizeICalUrl("https://example.com/feed.ics")).toBe("https://example.com/feed.ics");
  });

  test("leaves http:// URLs unchanged", () => {
    expect(normalizeICalUrl("http://example.com/feed.ics")).toBe("http://example.com/feed.ics");
  });

  test("trims surrounding whitespace", () => {
    expect(normalizeICalUrl("  webcal://example.com/feed.ics  ")).toBe(
      "https://example.com/feed.ics",
    );
  });

  test("preserves query strings and ports when rewriting", () => {
    expect(normalizeICalUrl("webcal://example.com:8443/feed.ics?token=abc")).toBe(
      "https://example.com:8443/feed.ics?token=abc",
    );
  });
});
