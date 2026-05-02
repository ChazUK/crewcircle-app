import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

export const insertSubCalendar = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    externalId: v.string(),
    label: v.string(),
    showAsBusy: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"calendarSubCalendars">> => {
    return ctx.db.insert("calendarSubCalendars", {
      connectionId: args.connectionId,
      externalId: args.externalId,
      label: args.label,
      showAsBusy: args.showAsBusy,
    });
  },
});
