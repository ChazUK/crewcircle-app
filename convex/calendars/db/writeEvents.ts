import { Doc, Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";

import { ParsedEvent } from "../domain/parseIcs";

export async function replaceConnectionEvents(
  ctx: MutationCtx,
  args: {
    connectionId: Id<"calendarConnections">;
    userId: Id<"users">;
    events: ParsedEvent[];
  },
) {
  const existing = await ctx.db
    .query("calendarEvents")
    .withIndex("byConnection", (q) => q.eq("connectionId", args.connectionId))
    .collect();

  const existingByExternal = new Map<string, Doc<"calendarEvents">>();
  for (const row of existing) existingByExternal.set(row.externalId, row);

  const nextExternalIds = new Set<string>();
  const now = Date.now();

  for (const event of args.events) {
    nextExternalIds.add(event.externalId);
    const prior = existingByExternal.get(event.externalId);
    const payload = {
      userId: args.userId,
      connectionId: args.connectionId,
      externalId: event.externalId,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      isAllDay: event.isAllDay,
      updatedAt: now,
    };
    if (prior) {
      await ctx.db.replace(prior._id, payload);
    } else {
      await ctx.db.insert("calendarEvents", payload);
    }
  }

  for (const row of existing) {
    if (!nextExternalIds.has(row.externalId)) {
      await ctx.db.delete(row._id);
    }
  }
}

export async function deleteConnectionEvents(
  ctx: MutationCtx,
  connectionId: Id<"calendarConnections">,
) {
  while (true) {
    const batch = await ctx.db
      .query("calendarEvents")
      .withIndex("byConnection", (q) => q.eq("connectionId", connectionId))
      .take(200);
    if (batch.length === 0) break;
    for (const row of batch) await ctx.db.delete(row._id);
    if (batch.length < 200) break;
  }
}
