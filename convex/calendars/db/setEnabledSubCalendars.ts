import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

// Diff the caller's selection against the existing calendarSubCalendars
// rows for this connection: insert rows for newly enabled sub-calendars
// (showAsBusy defaulting to true), delete rows for deselected ones, and
// schedule deleteConnectionEvents per removed sub-calendar so its cached
// events drain on the cascade chain rather than blowing this mutation's
// write budget. Sub-calendar counts are small in practice (<20), so the
// row-level work runs in one transaction without batching.
export const setEnabledSubCalendars = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    selections: v.array(
      v.object({
        externalId: v.string(),
        label: v.string(),
        color: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { connectionId, selections }) => {
    const existing = await ctx.db
      .query("calendarSubCalendars")
      .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
      .collect();

    // Dedupe selections by externalId — the table has no uniqueness
    // constraint on (connectionId, externalId), so duplicates in the
    // caller's input would otherwise insert duplicate sub-calendar rows.
    // Last entry wins per externalId.
    const dedupedSelections = Array.from(
      new Map(selections.map((s) => [s.externalId, s])).values(),
    );

    const existingByExternalId = new Map(existing.map((row) => [row.externalId, row]));
    const selectedExternalIds = new Set(dedupedSelections.map((s) => s.externalId));

    const toAdd = dedupedSelections.filter((s) => !existingByExternalId.has(s.externalId));
    const toRemove = existing.filter((row) => !selectedExternalIds.has(row.externalId));

    await Promise.all([
      ...toAdd.map((sel) =>
        ctx.db.insert("calendarSubCalendars", {
          connectionId,
          externalId: sel.externalId,
          label: sel.label,
          showAsBusy: true,
          color: sel.color,
        }),
      ),
      ...toRemove.flatMap((row) => [
        ctx.scheduler.runAfter(0, internal.calendars.db.cascadeDelete.deleteConnectionEvents, {
          subCalendarId: row._id,
        }),
        ctx.db.delete(row._id),
      ]),
    ]);
  },
});
