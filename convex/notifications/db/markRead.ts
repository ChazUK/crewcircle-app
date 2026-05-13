import { Id } from "@convex/_generated/dataModel";
import { MutationCtx } from "@convex/_generated/server";

export const markRead = async (ctx: MutationCtx, id: Id<"notifications">) =>
  ctx.db.patch(id, { readAt: Date.now() });
