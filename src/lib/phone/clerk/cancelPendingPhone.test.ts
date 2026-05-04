import { beforeEach, describe, expect, test, vi } from "vitest";

const mockIsClerkAPIResponseError = vi.hoisted(() => vi.fn<(err: unknown) => boolean>());
vi.mock("@clerk/expo", () => ({
  isClerkAPIResponseError: mockIsClerkAPIResponseError,
}));

import { cancelPendingPhone } from "./cancelPendingPhone";

type MockPhone = {
  verification: { status: string } | null;
  destroy: ReturnType<typeof vi.fn>;
};

type MockUser = {
  phoneNumbers: MockPhone[];
};

function makeClerkError(longMessage?: string, message?: string): unknown {
  return { errors: [{ longMessage, message }] };
}

describe("cancelPendingPhone", () => {
  beforeEach(() => {
    mockIsClerkAPIResponseError.mockReset();
    mockIsClerkAPIResponseError.mockReturnValue(false);
  });

  test("returns ok:true and calls no destroy when user has no phoneNumbers", async () => {
    const user: MockUser = { phoneNumbers: [] };

    const result = await cancelPendingPhone({ user: user as never });

    expect(result).toEqual({ ok: true });
  });

  test("returns ok:true and only destroys the pending phone when user has one pending and one verified", async () => {
    const mockDestroyPending = vi.fn().mockResolvedValue(undefined);
    const mockDestroyVerified = vi.fn().mockResolvedValue(undefined);
    const user: MockUser = {
      phoneNumbers: [
        { verification: { status: "unverified" }, destroy: mockDestroyPending },
        { verification: { status: "verified" }, destroy: mockDestroyVerified },
      ],
    };

    const result = await cancelPendingPhone({ user: user as never });

    expect(result).toEqual({ ok: true });
    expect(mockDestroyPending).toHaveBeenCalledOnce();
    expect(mockDestroyVerified).not.toHaveBeenCalled();
  });

  test("destroys both pending phones sequentially and returns ok:true", async () => {
    const callOrder: number[] = [];
    const mockDestroy1 = vi.fn().mockImplementation(async () => {
      callOrder.push(1);
    });
    const mockDestroy2 = vi.fn().mockImplementation(async () => {
      callOrder.push(2);
    });
    const user: MockUser = {
      phoneNumbers: [
        { verification: { status: "unverified" }, destroy: mockDestroy1 },
        { verification: null, destroy: mockDestroy2 },
      ],
    };

    const result = await cancelPendingPhone({ user: user as never });

    expect(result).toEqual({ ok: true });
    expect(mockDestroy1).toHaveBeenCalledOnce();
    expect(mockDestroy2).toHaveBeenCalledOnce();
    expect(callOrder).toEqual([1, 2]);
  });

  test("returns ok:false with longMessage when destroy rejects with a Clerk error", async () => {
    const clerkError = makeClerkError("Cannot destroy", undefined);
    const mockDestroy = vi.fn().mockRejectedValue(clerkError);
    mockIsClerkAPIResponseError.mockImplementation((err) => err === clerkError);
    const user: MockUser = {
      phoneNumbers: [{ verification: { status: "unverified" }, destroy: mockDestroy }],
    };

    const result = await cancelPendingPhone({ user: user as never });

    expect(result).toEqual({ ok: false, message: "Cannot destroy" });
  });
});
