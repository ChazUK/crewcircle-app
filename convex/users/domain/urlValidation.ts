import { ConvexError } from "convex/values";
import { z } from "zod";

const anyUrlSchema = z.url();
const httpUrlSchema = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });

export function assertSafeProfileUrl(value: string | undefined, fieldName: string): void {
  if (value === undefined) return;
  if (!anyUrlSchema.safeParse(value).success) {
    throw new ConvexError(`${fieldName} is not a valid URL`);
  }
  if (!httpUrlSchema.safeParse(value).success) {
    throw new ConvexError(`${fieldName} must use http or https`);
  }
}
