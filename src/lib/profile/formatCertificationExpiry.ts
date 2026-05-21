const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

type ExpiryStatus = "no-expiry" | "valid" | "expiring-soon" | "expired";

type ExpiryResult = {
  status: ExpiryStatus;
  label: string;
};

export function formatCertificationExpiry(
  expiresAt: number | undefined,
  now: number,
): ExpiryResult {
  if (expiresAt === undefined) {
    return { status: "no-expiry", label: "No expiry" };
  }

  if (expiresAt <= now) {
    return { status: "expired", label: "Expired" };
  }

  if (expiresAt <= now + SIXTY_DAYS_MS) {
    const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    return {
      status: "expiring-soon",
      label: `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    };
  }

  return { status: "valid", label: "Valid" };
}
