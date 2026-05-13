import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";

import { emitContactInviteNotification } from "../../notifications/domain/emitContactInviteNotification";
import { findContactPair } from "../db/findContactPair";
import { findPendingInvitesForEmail } from "../db/findPendingInvitesForEmail";
import { findPendingInvitesForPhone } from "../db/findPendingInvitesForPhone";

export const convertExternalInvitesForNewUser = async (
  ctx: MutationCtx,
  args: { userId: Id<"users">; email?: string; phone?: string },
) => {
  const matches = new Map<Id<"contactInvites">, "email" | "phone">();

  if (args.email) {
    const emailInvites = await findPendingInvitesForEmail(ctx, args.email);
    for (const invite of emailInvites) {
      if (invite.fromUserId === args.userId) continue;
      matches.set(invite._id, "email");
    }
  }

  if (args.phone) {
    const phoneInvites = await findPendingInvitesForPhone(ctx, args.phone);
    for (const invite of phoneInvites) {
      if (invite.fromUserId === args.userId) continue;
      if (!matches.has(invite._id)) matches.set(invite._id, "phone");
    }
  }

  const now = Date.now();
  const convertedSenders = new Set<Id<"users">>();

  for (const [inviteId, source] of matches) {
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.status !== "pending") continue;

    const existingContact = await findContactPair(ctx, invite.fromUserId, args.userId);
    if (existingContact) {
      await ctx.db.patch(inviteId, { status: "canceled", respondedAt: now });
      continue;
    }

    if (convertedSenders.has(invite.fromUserId)) {
      await ctx.db.patch(inviteId, { status: "canceled", respondedAt: now });
      continue;
    }
    convertedSenders.add(invite.fromUserId);

    await ctx.db.patch(inviteId, {
      target: { kind: "user", userId: args.userId },
      targetUserId: args.userId,
      targetEmail: undefined,
      targetPhone: undefined,
      convertedFromTarget: source,
    });

    await emitContactInviteNotification(ctx, {
      userId: args.userId,
      kind: "contact_invite_received",
      inviteId,
      actorUserId: invite.fromUserId,
    });
  }
};
