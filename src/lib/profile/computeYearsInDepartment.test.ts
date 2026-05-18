import { describe, expect, test } from "vitest";

import { computeYearsInDepartment } from "./computeYearsInDepartment";

describe("computeYearsInDepartment", () => {
  test("same year returns 0", () => {
    expect(computeYearsInDepartment(2024, new Date("2024-06-15"))).toBe(0);
  });

  test("one year before returns 1", () => {
    expect(computeYearsInDepartment(2023, new Date("2024-06-15"))).toBe(1);
  });

  test("ten years before returns 10", () => {
    expect(computeYearsInDepartment(2014, new Date("2024-06-15"))).toBe(10);
  });

  test("future year returns negative", () => {
    expect(computeYearsInDepartment(2025, new Date("2024-06-15"))).toBe(-1);
  });
});
