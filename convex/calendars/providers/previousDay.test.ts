import { describe, expect, test } from "vitest";

import { previousDay } from "./previousDay";

describe("previousDay", () => {
  test("subtracts one day in the middle of a month", () => {
    expect(previousDay("2026-05-19")).toBe("2026-05-18");
  });

  test("rolls back across month boundary", () => {
    expect(previousDay("2026-06-01")).toBe("2026-05-31");
  });

  test("rolls back across year boundary", () => {
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
  });

  test("handles leap day correctly", () => {
    expect(previousDay("2024-03-01")).toBe("2024-02-29");
  });
});
