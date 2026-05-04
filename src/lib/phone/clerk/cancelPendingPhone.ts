import { isClerkAPIResponseError } from "@clerk/expo";
import type { UserResource } from "@clerk/shared/types";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export async function cancelPendingPhone(params: {
  user: UserResource;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const pendingPhones = params.user.phoneNumbers.filter(
    (phone) => phone.verification?.status !== "verified",
  );

  if (pendingPhones.length === 0) {
    return { ok: true };
  }

  for (const phone of pendingPhones) {
    try {
      await phone.destroy();
    } catch (error) {
      if (isClerkAPIResponseError(error)) {
        const message =
          error.errors[0]?.longMessage ?? error.errors[0]?.message ?? FALLBACK_MESSAGE;
        return { ok: false, message };
      }
      return { ok: false, message: FALLBACK_MESSAGE };
    }
  }

  return { ok: true };
}
