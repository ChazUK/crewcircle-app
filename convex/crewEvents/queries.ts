import { v } from "convex/values";

import { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { getUserByExternalId } from "../users/db/getUser";

export const getById = internalQuery({
  args: { id: v.id("crewEvents") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

type GetByIdForUserResult =
  | { kind: "ok"; event: Doc<"crewEvents"> }
  | { kind: "forbidden" }
  | { kind: "not_found" };

// Single query that fetches the event and verifies ownership in one round-trip.
export const getByIdForUser = internalQuery({
  args: { id: v.id("crewEvents"), externalAuthId: v.string() },
  handler: async (ctx, args): Promise<GetByIdForUserResult> => {
    const event = await ctx.db.get(args.id);
    if (!event) return { kind: "not_found" };
    const user = await getUserByExternalId(ctx, args.externalAuthId);
    if (!user || event.userId !== user._id) return { kind: "forbidden" };
    return { kind: "ok", event };
  },
});
