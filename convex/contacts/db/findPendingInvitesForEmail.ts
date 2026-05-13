import { QueryCtx } from "@convex/_generated/server";

export const findPendingInvitesForEmail = (ctx: QueryCtx, email: string) =>
  ctx.db
    .query("contactInvites")
    .withIndex("byTargetEmailAndStatus", (q) =>
      q.eq("targetEmail", email.toLowerCase()).eq("status", "pending"),
    )
    .collect();
