import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

// Returns the colours already in use across a Crew Member's existing
// Calendar Connections, so assignPaletteColour can pick the next free
// slot in the palette. Sole caller is service.connect, but kept as an
// internal query (not a helper) because it's invoked across the
// action → query boundary.
export const getConnectionColoursForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<string[]> => {
    const connections = await ctx.db
      .query("calendarConnections")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .collect();
    return connections.map((connection) => connection.color);
  },
});
