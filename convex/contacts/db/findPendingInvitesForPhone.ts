import { QueryCtx } from "@convex/_generated/server";

export const findPendingInvitesForPhone = (ctx: QueryCtx, phone: string) =>
  ctx.db
    .query("contactInvites")
    .withIndex("byTargetPhoneAndStatus", (q) => q.eq("targetPhone", phone).eq("status", "pending"))
    .collect();
