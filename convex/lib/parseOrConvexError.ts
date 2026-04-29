import { ConvexError } from "convex/values";
import { z } from "zod";

export function parseOrConvexError<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConvexError(result.error.issues[0].message);
  }
  return result.data;
}
