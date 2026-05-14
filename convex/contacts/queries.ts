import { v } from "convex/values";

import { Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getUserByExternalId } from "../users/db/getUser";
import { findContactPair } from "./db/findContactPair";
import { listContactsForOwner } from "./db/listContactsForOwner";

export const listMyContacts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return [];

    const rows = await listContactsForOwner(ctx, me._id);
    const enriched: Array<{
      contactId: Id<"contacts">;
      user: Doc<"users">;
      createdAt: number;
    }> = [];
    for (const row of rows) {
      const user = await ctx.db.get(row.contactUserId);
      if (user) {
        enriched.push({
          contactId: row._id,
          user,
          createdAt: row.createdAt,
        });
      }
    }
    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listMyIncomingInvites = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return [];

    const invites = await ctx.db
      .query("contactInvites")
      .withIndex("byTargetUserAndStatus", (q) =>
        q.eq("targetUserId", me._id).eq("status", "pending"),
      )
      .collect();

    const enriched: Array<{ invite: Doc<"contactInvites">; from: Doc<"users"> | null }> = [];
    for (const invite of invites) {
      const from = await ctx.db.get(invite.fromUserId);
      enriched.push({ invite, from });
    }
    return enriched.sort((a, b) => b.invite.createdAt - a.invite.createdAt);
  },
});

export const listMyOutgoingInvites = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return [];

    const invites = await ctx.db
      .query("contactInvites")
      .withIndex("byFromUserAndStatus", (q) => q.eq("fromUserId", me._id).eq("status", "pending"))
      .collect();

    const enriched: Array<{
      invite: Doc<"contactInvites">;
      targetUser: Doc<"users"> | null;
    }> = [];
    for (const invite of invites) {
      const targetUser = invite.targetUserId ? await ctx.db.get(invite.targetUserId) : null;
      enriched.push({ invite, targetUser });
    }
    return enriched.sort((a, b) => b.invite.createdAt - a.invite.createdAt);
  },
});

export const searchUsers = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await getUserByExternalId(ctx, identity.subject);
    if (!me) return [];

    const needle = args.query.trim();
    if (needle.length < 2) return [];
    const limit = Math.min(args.limit ?? 20, 50);
    const fetchPerIndex = limit * 3;

    const [byEmail, byFirstName, byLastName] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("searchByEmail", (q) => q.search("email", needle))
        .take(fetchPerIndex),
      ctx.db
        .query("users")
        .withSearchIndex("searchByFirstName", (q) => q.search("firstName", needle))
        .take(fetchPerIndex),
      ctx.db
        .query("users")
        .withSearchIndex("searchByLastName", (q) => q.search("lastName", needle))
        .take(fetchPerIndex),
    ]);

    const seen = new Set<Id<"users">>();
    const candidates: Doc<"users">[] = [];
    for (const user of [...byEmail, ...byFirstName, ...byLastName]) {
      if (user._id === me._id) continue;
      if (seen.has(user._id)) continue;
      seen.add(user._id);
      candidates.push(user);
    }

    const [outgoingPending, incomingPending] = await Promise.all([
      ctx.db
        .query("contactInvites")
        .withIndex("byFromUserAndStatus", (q) => q.eq("fromUserId", me._id).eq("status", "pending"))
        .collect(),
      ctx.db
        .query("contactInvites")
        .withIndex("byTargetUserAndStatus", (q) =>
          q.eq("targetUserId", me._id).eq("status", "pending"),
        )
        .collect(),
    ]);
    const outgoingTargetIds = new Set(
      outgoingPending.map((row) => row.targetUserId).filter((id): id is Id<"users"> => id != null),
    );
    const incomingFromIds = new Set(incomingPending.map((row) => row.fromUserId));

    const results: Array<{ user: Doc<"users">; state: "none" | "pending" | "contact" }> = [];
    for (const user of candidates) {
      const contact = await findContactPair(ctx, me._id, user._id);
      let state: "none" | "pending" | "contact" = "none";
      if (contact) {
        state = "contact";
      } else if (outgoingTargetIds.has(user._id) || incomingFromIds.has(user._id)) {
        state = "pending";
      }
      results.push({ user, state });
      if (results.length >= limit) break;
    }
    return results;
  },
});
