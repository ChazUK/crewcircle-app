import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import { internalQuery } from "../../_generated/server";

// Internal building block for requireOwnedConnection — fetches a Calendar
// Connection only if it belongs to the supplied user. Direct callers from
// outside the auth module are discouraged; use requireOwnedConnection
// from action code instead so the identity → user → ownership chain is
// enforced in one place.
export const getConnectionForOwner = internalQuery({
  args: { connectionId: v.id("calendarConnections"), userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"calendarConnections"> | null> => {
    const doc = await ctx.db.get(args.connectionId);
    if (!doc) return null;
    if (doc.userId !== args.userId) return null;
    return doc;
  },
});
