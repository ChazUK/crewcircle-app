import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * Extracts the long message from a Clerk global hook error.
 *
 * ClerkGlobalHookError wraps either a ClerkAPIResponseError (which carries
 * an `errors[]` array of typed API errors) or a plain ClerkRuntimeError.
 * We narrow the type with the official guard before accessing `errors[0]`.
 */
export function getClerkErrorMessage(err: unknown): string | undefined {
  if (!err) return undefined;
  if (isClerkAPIResponseError(err)) {
    return err.errors[0]?.longMessage;
  }
  return undefined;
}
