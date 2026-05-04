import { isClerkAPIResponseError } from "@clerk/expo";
import type { UserResource } from "@clerk/shared/types";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export async function confirmVerification(params: {
  user: UserResource;
  code: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { user, code } = params;

    const pending = user.phoneNumbers.filter((p) => p.verification?.status !== "verified");
    const pendingPhone = pending[pending.length - 1];

    if (!pendingPhone) {
      return { ok: false, message: "No pending phone to verify." };
    }

    await pendingPhone.attemptVerification({ code });
    await user.update({ primaryPhoneNumberId: pendingPhone.id });

    const others = user.phoneNumbers.filter((p) => p.id !== pendingPhone.id);
    await Promise.all(others.map((p) => p.destroy()));

    return { ok: true };
  } catch (error) {
    if (isClerkAPIResponseError(error)) {
      const message = error.errors[0]?.longMessage ?? error.errors[0]?.message ?? FALLBACK_MESSAGE;
      return { ok: false, message };
    }
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}
