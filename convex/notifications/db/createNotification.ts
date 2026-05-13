import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";

type NotificationKind =
  | "contact_invite_received"
  | "contact_invite_accepted"
  | "contact_invite_declined";

export const createNotification = (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    kind: NotificationKind;
    inviteId: Id<"contactInvites">;
    actorUserId?: Id<"users">;
  },
) =>
  ctx.db.insert("notifications", {
    userId: args.userId,
    kind: args.kind,
    payload: {
      inviteId: args.inviteId,
      ...(args.actorUserId && { actorUserId: args.actorUserId }),
    },
    createdAt: Date.now(),
  });
