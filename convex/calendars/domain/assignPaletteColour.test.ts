import { describe, expect, test } from "vitest";

import { assignPaletteColour } from "./assignPaletteColour";

const FIRST_COLOUR = "#6366f1";
const SECOND_COLOUR = "#10b981";
const PALETTE_SIZE = 10;

describe("assignPaletteColour", () => {
  test("returns the first palette colour when no colours are in use", () => {
    expect(assignPaletteColour([])).toBe(FIRST_COLOUR);
  });

  test("skips already-used colours and returns the next available one", () => {
    expect(assignPaletteColour([FIRST_COLOUR])).toBe(SECOND_COLOUR);
  });

  test("cycles back correctly when all palette colours are in use", () => {
    const allColours = [
      "#6366f1",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#84cc16",
    ];
    expect(allColours).toHaveLength(PALETTE_SIZE);
    const result = assignPaletteColour(allColours);
    expect(result).toBe(allColours[allColours.length % PALETTE_SIZE]);
  });

  test("is pure — calling it twice with the same input returns the same result", () => {
    const used = [FIRST_COLOUR];
    const first = assignPaletteColour(used);
    const second = assignPaletteColour(used);
    expect(first).toBe(second);
    expect(used).toEqual([FIRST_COLOUR]);
  });
});
