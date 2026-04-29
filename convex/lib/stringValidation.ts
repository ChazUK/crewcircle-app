import { ConvexError } from "convex/values";

export function assertMaxLength(value: string | undefined, field: string, max: number): void {
  if (value !== undefined && value.length > max) {
    throw new ConvexError(`${field} exceeds maximum length of ${max} characters`);
  }
}
