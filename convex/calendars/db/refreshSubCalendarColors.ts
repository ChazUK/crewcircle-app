import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const refreshSubCalendarColors = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    updates: v.array(
      v.object({
        externalId: v.string(),
        color: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { connectionId, updates }) => {
    const rows = await ctx.db
      .query("calendarSubCalendars")
      .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
      .collect();
    const rowsByExternalId = new Map(rows.map((row) => [row.externalId, row]));

    await Promise.all(
      updates.map((update) => {
        const row = rowsByExternalId.get(update.externalId);
        if (!row) return undefined;
        if (row.color === update.color) return undefined;
        return ctx.db.patch(row._id, { color: update.color });
      }),
    );
  },
});
