import { beforeEach, describe, expect, test, vi } from "vitest";

const mockIsClerkAPIResponseError = vi.hoisted(() => vi.fn<(err: unknown) => boolean>());
vi.mock("@clerk/expo", () => ({
  isClerkAPIResponseError: mockIsClerkAPIResponseError,
}));

import { confirmVerification } from "./confirmVerification";

type MockPhone = {
  id: string;
  verification: { status: string } | null;
  attemptVerification: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

type MockUser = {
  phoneNumbers: MockPhone[];
  update: ReturnType<typeof vi.fn>;
};

function makeClerkError(longMessage?: string, message?: string): unknown {
  return { errors: [{ longMessage, message }] };
}

describe("confirmVerification", () => {
  let user: MockUser;
  let pendingPhone: MockPhone;
  let verifiedPhone: MockPhone;

  beforeEach(() => {
    mockIsClerkAPIResponseError.mockReset();
    mockIsClerkAPIResponseError.mockReturnValue(false);

    pendingPhone = {
      id: "phone_pending",
      verification: { status: "unverified" },
      attemptVerification: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    verifiedPhone = {
      id: "phone_verified_old",
      verification: { status: "verified" },
      attemptVerification: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    user = {
      phoneNumbers: [verifiedPhone, pendingPhone],
      update: vi.fn().mockResolvedValue(undefined),
    };
  });

  test("returns ok:true, sets pending phone as primary, and destroys other phones", async () => {
    const result = await confirmVerification({
      user: user as never,
      code: "123456",
    });

    expect(result).toEqual({ ok: true });
    expect(pendingPhone.attemptVerification).toHaveBeenCalledWith({ code: "123456" });
    expect(user.update).toHaveBeenCalledWith({ primaryPhoneNumberId: "phone_pending" });
    expect(verifiedPhone.destroy).toHaveBeenCalledOnce();
    expect(pendingPhone.destroy).not.toHaveBeenCalled();
  });

  test("returns ok:false when no pending phone exists", async () => {
    user.phoneNumbers = [{ ...verifiedPhone }];

    const result = await confirmVerification({
      user: user as never,
      code: "123456",
    });

    expect(result).toEqual({ ok: false, message: "No pending phone to verify." });
  });

  test("returns ok:false with longMessage when attemptVerification rejects with Clerk error", async () => {
    const clerkError = makeClerkError("Incorrect code", undefined);
    pendingPhone.attemptVerification.mockRejectedValue(clerkError);
    mockIsClerkAPIResponseError.mockImplementation((err) => err === clerkError);

    const result = await confirmVerification({
      user: user as never,
      code: "000000",
    });

    expect(result).toEqual({ ok: false, message: "Incorrect code" });
  });

  test("returns ok:false with message when attemptVerification rejects with Clerk error with only message (no longMessage)", async () => {
    const clerkError = makeClerkError(undefined, "Code expired");
    pendingPhone.attemptVerification.mockRejectedValue(clerkError);
    mockIsClerkAPIResponseError.mockImplementation((err) => err === clerkError);

    const result = await confirmVerification({
      user: user as never,
      code: "000000",
    });

    expect(result).toEqual({ ok: false, message: "Code expired" });
  });

  test("returns ok:false when user.update rejects with Clerk error after verification succeeds", async () => {
    const clerkError = makeClerkError("Unable to update primary phone", undefined);
    user.update.mockRejectedValue(clerkError);
    mockIsClerkAPIResponseError.mockImplementation((err) => err === clerkError);

    const result = await confirmVerification({
      user: user as never,
      code: "123456",
    });

    expect(result).toEqual({ ok: false, message: "Unable to update primary phone" });
  });
});
