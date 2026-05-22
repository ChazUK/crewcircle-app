import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

export type MembershipSummary = {
  id: Id<"memberships">;
  name: string;
  memberNumber: string | undefined;
};

export async function fetchSortedMemberships(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<MembershipSummary[]> {
  const rows = await ctx.db
    .query("memberships")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .collect();

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return rows.map((r) => ({
    id: r._id,
    name: r.name,
    memberNumber: r.memberNumber,
  }));
}
