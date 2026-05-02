import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

// Single entry point for "the calling Crew Member must own this Calendar
// Connection" — every action that touches a specific Calendar Connection
// goes through here. Replaces the per-method identity → user → ownership
// dance previously repeated in service.disconnect and
// service.listSubCalendars (and load-bearingly, in a comment, for
// cascade-delete callers).
export async function requireOwnedConnection(
  ctx: ActionCtx,
  connectionId: Id<"calendarConnections">,
): Promise<{ user: Doc<"users">; connection: Doc<"calendarConnections"> }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user: Doc<"users"> | null = await ctx.runQuery(api.users.queries.getCurrentUser, {});
  if (!user) throw new Error("User not found");

  const connection: Doc<"calendarConnections"> | null = await ctx.runQuery(
    internal.calendars.auth.getConnectionForOwner.getConnectionForOwner,
    { connectionId, userId: user._id },
  );
  if (!connection) throw new Error("Connection not found");

  return { user, connection };
}
