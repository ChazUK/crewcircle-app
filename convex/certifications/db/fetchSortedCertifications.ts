import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

export type CertificationSummary = {
  id: Id<"certifications">;
  name: string;
  issuer: string | undefined;
  referenceNumber: string | undefined;
  expiresAt: number | undefined;
};

export async function fetchSortedCertifications(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<CertificationSummary[]> {
  const rows = await ctx.db
    .query("certifications")
    .withIndex("byUserIdAndExpiresAt", (q) => q.eq("userId", userId))
    .collect();

  const withExpiry = rows.filter((r) => r.expiresAt !== undefined);
  const withoutExpiry = rows.filter((r) => r.expiresAt === undefined);
  withExpiry.sort((a, b) => (a.expiresAt as number) - (b.expiresAt as number));

  return [...withExpiry, ...withoutExpiry].map((r) => ({
    id: r._id,
    name: r.name,
    issuer: r.issuer,
    referenceNumber: r.referenceNumber,
    expiresAt: r.expiresAt,
  }));
}
