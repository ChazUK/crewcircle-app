import { v } from "convex/values";

import { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { getUserByExternalId } from "../users/db/getUser";

export const getById = internalQuery({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

type GetByIdForUserResult =
  | { kind: "ok"; job: Doc<"jobs"> }
  | { kind: "forbidden" }
  | { kind: "not_found" };

// Single query that fetches the job, verifies it is filled, and checks ownership in one round-trip.
export const getByIdForUser = internalQuery({
  args: { id: v.id("jobs"), externalAuthId: v.string() },
  handler: async (ctx, args): Promise<GetByIdForUserResult> => {
    const job = await ctx.db.get(args.id);
    if (!job || job.status !== "filled" || !job.assignedUserId) return { kind: "not_found" };
    const user = await getUserByExternalId(ctx, args.externalAuthId);
    if (!user || job.assignedUserId !== user._id) return { kind: "forbidden" };
    return { kind: "ok", job };
  },
});
