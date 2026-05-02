import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";

// Insert a Calendar Connection and any Sub-Calendars from the provider's
// blueprint atomically. Combining the two writes in one Convex mutation
// guarantees a Calendar Connection is never installed without the
// Sub-Calendars it needs to be syncable — replaces the two-mutation
// orchestration that previously required service-level rollback when the
// second write failed.
export const insertCalendarConnection = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.union(
      v.literal("google"),
      v.literal("ical"),
      v.literal("microsoft"),
      v.literal("native"),
    ),
    label: v.string(),
    color: v.string(),
    blueprint: v.object({
      externalAccountId: v.optional(v.string()),
      icalUrl: v.optional(v.string()),
      localCalendarId: v.optional(v.string()),
      scope: v.optional(v.string()),
      oauthClientId: v.optional(v.string()),
      encryptedTokens: v.optional(v.bytes()),
      tokenExpiresAt: v.optional(v.number()),
    }),
    subCalendars: v.array(
      v.object({
        externalId: v.string(),
        label: v.string(),
        showAsBusy: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Id<"calendarConnections">> => {
    const connectionId = await ctx.db.insert("calendarConnections", {
      userId: args.userId,
      provider: args.provider,
      label: args.label,
      color: args.color,
      createdAt: Date.now(),
      syncErrorCount: 0,
      ...args.blueprint,
    });
    await Promise.all(
      args.subCalendars.map((sub) =>
        ctx.db.insert("calendarSubCalendars", {
          connectionId,
          externalId: sub.externalId,
          label: sub.label,
          showAsBusy: sub.showAsBusy,
        }),
      ),
    );
    return connectionId;
  },
});
