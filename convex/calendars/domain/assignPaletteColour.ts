const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
] as const;

export function assignPaletteColour(usedColours: string[]): string {
  const available = PALETTE.find((colour) => !usedColours.includes(colour));
  if (available !== undefined) return available;
  return PALETTE[usedColours.length % PALETTE.length];
}
