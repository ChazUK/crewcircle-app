import { Doc, Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";

export type IncomingEvent = {
  externalId: string;
  subCalendarId?: string;
  uid?: string;
  recurrenceId?: number;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
};

export async function replaceConnectionEvents(
  ctx: MutationCtx,
  args: {
    connectionId: Id<"calendarConnections">;
    userId: Id<"users">;
    events: IncomingEvent[];
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
      subCalendarId: event.subCalendarId,
      externalId: event.externalId,
      uid: event.uid,
      recurrenceId: event.recurrenceId,
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
      // Track newly-inserted rows in the map so a duplicate externalId later
      // in the same batch is replaced rather than inserted a second time.
      const newId = await ctx.db.insert("calendarEvents", payload);
      existingByExternal.set(event.externalId, {
        _id: newId,
        _creationTime: now,
        ...payload,
      });
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
