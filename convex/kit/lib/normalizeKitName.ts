export function normalizeKitName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}
