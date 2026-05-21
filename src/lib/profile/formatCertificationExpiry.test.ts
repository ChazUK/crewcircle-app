import { describe, expect, test } from "vitest";

import { formatCertificationExpiry } from "./formatCertificationExpiry";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 15);

describe("formatCertificationExpiry", () => {
  test("no expiresAt returns no-expiry", () => {
    const result = formatCertificationExpiry(undefined, NOW);
    expect(result.status).toBe("no-expiry");
    expect(result.label).toBe("No expiry");
  });

  test("61 days ahead returns valid", () => {
    const result = formatCertificationExpiry(NOW + 61 * DAY_MS, NOW);
    expect(result.status).toBe("valid");
    expect(result.label).toBe("Valid");
  });

  test("exactly 60 days ahead returns expiring-soon", () => {
    const result = formatCertificationExpiry(NOW + 60 * DAY_MS, NOW);
    expect(result.status).toBe("expiring-soon");
    expect(result.label).toMatch(/Expires in 60 days/);
  });

  test("1 day ahead returns expiring-soon", () => {
    const result = formatCertificationExpiry(NOW + 1 * DAY_MS, NOW);
    expect(result.status).toBe("expiring-soon");
    expect(result.label).toBe("Expires in 1 day");
  });

  test("expiresAt equals now returns expired", () => {
    const result = formatCertificationExpiry(NOW, NOW);
    expect(result.status).toBe("expired");
    expect(result.label).toBe("Expired");
  });

  test("1 day past returns expired", () => {
    const result = formatCertificationExpiry(NOW - 1 * DAY_MS, NOW);
    expect(result.status).toBe("expired");
    expect(result.label).toBe("Expired");
  });
});
