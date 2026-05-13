import { Doc, Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";
import { ConvexError } from "convex/values";

import { internal } from "../../_generated/api";
import { emailWorkpool } from "../../emails/emailWorkpool";
import { emitContactInviteNotification } from "../../notifications/domain/emitContactInviteNotification";
import { getUserByExternalId } from "../../users/db/getUser";
import { findContactPair } from "../db/findContactPair";
import { findPendingInviteBetween } from "../db/findPendingInviteBetween";
import { acceptContactInvite } from "./acceptContactInvite";
import { inviterDisplayName } from "./inviterDisplayName";

type Args = {
  targetUserId?: Id<"users">;
  email?: string;
  phone?: string;
  message?: string;
};

export const sendContactInvite = async (ctx: MutationCtx, args: Args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("not_authenticated");

  const me = await getUserByExternalId(ctx, identity.subject);
  if (!me) throw new ConvexError("user_not_found");

  const provided = [args.targetUserId, args.email, args.phone].filter((v) => v != null).length;
  if (provided !== 1) throw new ConvexError("invalid_target");

  if (args.targetUserId) {
    return sendUserInvite(ctx, me, args.targetUserId, args.message);
  }

  if (args.email) {
    return sendEmailInvite(ctx, me, args.email, args.message);
  }

  if (args.phone) {
    return sendPhoneInvite(ctx, me, args.phone, args.message);
  }

  throw new ConvexError("invalid_target");
};

const sendUserInvite = async (
  ctx: MutationCtx,
  me: Doc<"users">,
  targetUserId: Id<"users">,
  message: string | undefined,
) => {
  if (targetUserId === me._id) throw new ConvexError("self_invite");

  const target = await ctx.db.get(targetUserId);
  if (!target) throw new ConvexError("target_not_found");

  const existingContact = await findContactPair(ctx, me._id, targetUserId);
  if (existingContact) throw new ConvexError("already_contact");

  const existingInvite = await findPendingInviteBetween(ctx, me._id, targetUserId);
  if (existingInvite) {
    if (existingInvite.fromUserId === targetUserId) {
      await acceptContactInvite(ctx, existingInvite._id);
      return { autoAccepted: true, inviteId: existingInvite._id };
    }
    throw new ConvexError("invite_exists");
  }

  const inviteId = await ctx.db.insert("contactInvites", {
    fromUserId: me._id,
    target: { kind: "user", userId: targetUserId },
    targetUserId,
    status: "pending",
    createdAt: Date.now(),
    ...(message && { message }),
  });

  await emitContactInviteNotification(ctx, {
    userId: targetUserId,
    kind: "contact_invite_received",
    inviteId,
    actorUserId: me._id,
  });

  return { autoAccepted: false, inviteId };
};

const sendEmailInvite = async (
  ctx: MutationCtx,
  me: Doc<"users">,
  emailRaw: string,
  message: string | undefined,
) => {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) throw new ConvexError("invalid_email");
  if (me.email?.toLowerCase() === email) throw new ConvexError("self_invite");

  const existingUser = await ctx.db
    .query("users")
    .withIndex("byEmail", (q) => q.eq("email", email))
    .unique();
  if (existingUser) {
    return sendUserInvite(ctx, me, existingUser._id, message);
  }

  const existing = await ctx.db
    .query("contactInvites")
    .withIndex("byTargetEmailAndStatus", (q) => q.eq("targetEmail", email).eq("status", "pending"))
    .collect();
  if (existing.some((row) => row.fromUserId === me._id)) {
    throw new ConvexError("invite_exists");
  }

  const inviteId = await ctx.db.insert("contactInvites", {
    fromUserId: me._id,
    target: { kind: "email", email },
    targetEmail: email,
    status: "pending",
    createdAt: Date.now(),
    ...(message && { message }),
  });

  await emailWorkpool.enqueueAction(
    ctx,
    internal.emails.sendContactInviteEmail.sendContactInviteEmail,
    {
      inviteId,
      recipientEmail: email,
      inviterName: inviterDisplayName(me),
      inviterEmail: me.email,
      ...(message && { message }),
    },
  );

  return { autoAccepted: false, inviteId };
};

const sendPhoneInvite = async (
  ctx: MutationCtx,
  me: Doc<"users">,
  phoneRaw: string,
  message: string | undefined,
) => {
  const phone = phoneRaw.trim();
  if (!phone.startsWith("+")) throw new ConvexError("invalid_phone");
  if (me.phone && me.phone === phone) throw new ConvexError("self_invite");

  const existingUser = await ctx.db
    .query("users")
    .withIndex("byPhone", (q) => q.eq("phone", phone))
    .unique();
  if (existingUser) {
    return sendUserInvite(ctx, me, existingUser._id, message);
  }

  const existing = await ctx.db
    .query("contactInvites")
    .withIndex("byTargetPhoneAndStatus", (q) => q.eq("targetPhone", phone).eq("status", "pending"))
    .collect();
  if (existing.some((row) => row.fromUserId === me._id)) {
    throw new ConvexError("invite_exists");
  }

  const inviteId = await ctx.db.insert("contactInvites", {
    fromUserId: me._id,
    target: { kind: "phone", phone },
    targetPhone: phone,
    status: "pending",
    createdAt: Date.now(),
    ...(message && { message }),
  });

  // TODO: deliver SMS invite via provider (Twilio/etc.)
  return { autoAccepted: false, inviteId };
};
