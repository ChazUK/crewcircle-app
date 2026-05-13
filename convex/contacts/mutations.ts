import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireCurrentUser } from "./db/requireCurrentUser";
import { acceptContactInvite as acceptContactInviteDomain } from "./domain/acceptContactInvite";
import { cancelContactInvite as cancelContactInviteDomain } from "./domain/cancelContactInvite";
import { declineContactInvite as declineContactInviteDomain } from "./domain/declineContactInvite";
import { removeContact as removeContactDomain } from "./domain/removeContact";
import { sendContactInvite as sendContactInviteDomain } from "./domain/sendContactInvite";

export const sendContactInvite = mutation({
  args: {
    targetUserId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: (ctx, args) => sendContactInviteDomain(ctx, args),
});

export const acceptContactInvite = mutation({
  args: { inviteId: v.id("contactInvites") },
  handler: async (ctx, args) => {
    const me = await requireCurrentUser(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new ConvexError("invite_not_found");
    if (invite.targetUserId !== me._id) throw new ConvexError("not_invitee");
    await acceptContactInviteDomain(ctx, args.inviteId);
  },
});

export const declineContactInvite = mutation({
  args: { inviteId: v.id("contactInvites") },
  handler: async (ctx, args) => {
    const me = await requireCurrentUser(ctx);
    await declineContactInviteDomain(ctx, args.inviteId, me._id);
  },
});

export const cancelContactInvite = mutation({
  args: { inviteId: v.id("contactInvites") },
  handler: async (ctx, args) => {
    const me = await requireCurrentUser(ctx);
    await cancelContactInviteDomain(ctx, args.inviteId, me._id);
  },
});

export const removeContact = mutation({
  args: { contactUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireCurrentUser(ctx);
    await removeContactDomain(ctx, me._id, args.contactUserId);
  },
});
