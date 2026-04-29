import { ConvexError } from "convex/values";

export function assertSafeProfileUrl(value: string | undefined, fieldName: string): void {
  if (value === undefined) return;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConvexError(`${fieldName} is not a valid URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ConvexError(`${fieldName} must use http or https`);
  }
}
