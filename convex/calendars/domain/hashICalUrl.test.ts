import { describe, expect, test } from "vitest";

import { hashICalUrl } from "./hashICalUrl";

describe("hashICalUrl", () => {
  test("returns a 64-character lowercase hex string", async () => {
    const hash = await hashICalUrl("https://example.com/cal.ics");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("returns the same hash for the same input", async () => {
    const a = await hashICalUrl("https://example.com/cal.ics");
    const b = await hashICalUrl("https://example.com/cal.ics");
    expect(a).toBe(b);
  });

  test("differs by a single character of input", async () => {
    const a = await hashICalUrl("https://example.com/cal.ics");
    const b = await hashICalUrl("https://example.com/cal.icS");
    expect(a).not.toBe(b);
  });
});
