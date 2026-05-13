import { internal } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";

import { createNotification } from "../db/createNotification";

type NotificationKind =
  | "contact_invite_received"
  | "contact_invite_accepted"
  | "contact_invite_declined";

const TITLE_BY_KIND: Record<NotificationKind, string> = {
  contact_invite_received: "New contact request",
  contact_invite_accepted: "Contact request accepted",
  contact_invite_declined: "Contact request declined",
};

const BODY_BY_KIND: Record<NotificationKind, string> = {
  contact_invite_received: "Someone wants to add you as a contact.",
  contact_invite_accepted: "Your contact request was accepted.",
  contact_invite_declined: "Your contact request was declined.",
};

export const emitContactInviteNotification = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    kind: NotificationKind;
    inviteId: Id<"contactInvites">;
    actorUserId?: Id<"users">;
  },
) => {
  await createNotification(ctx, args);
  await ctx.scheduler.runAfter(0, internal.notifications.actions.sendExpoPush, {
    userId: args.userId,
    title: TITLE_BY_KIND[args.kind],
    body: BODY_BY_KIND[args.kind],
    data: { kind: args.kind, inviteId: args.inviteId },
  });
};
