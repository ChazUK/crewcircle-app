import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const updateICalMeta = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    icalEtag: v.optional(v.string()),
    icalLastModified: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      icalEtag: args.icalEtag,
      icalLastModified: args.icalLastModified,
    });
  },
});
