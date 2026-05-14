import { describe, expect, test } from "vitest";

import { DEPARTMENT_ROLES, DEPARTMENTS } from "./departments";

describe("DEPARTMENT_ROLES", () => {
  test("every Department key has an entry in DEPARTMENT_ROLES", () => {
    for (const dept of DEPARTMENTS) {
      expect(DEPARTMENT_ROLES).toHaveProperty(dept);
    }
  });

  test("no Department has an empty roles list", () => {
    for (const dept of DEPARTMENTS) {
      expect(DEPARTMENT_ROLES[dept].length).toBeGreaterThan(0);
    }
  });

  test("no Department has duplicate roles", () => {
    for (const dept of DEPARTMENTS) {
      const roles = DEPARTMENT_ROLES[dept];
      const unique = new Set(roles);
      expect(unique.size).toBe(roles.length);
    }
  });
});
