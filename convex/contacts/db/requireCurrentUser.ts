import { MutationCtx, QueryCtx } from "@convex/_generated/server";
import { ConvexError } from "convex/values";

import { getUserByExternalId } from "../../users/db/getUser";

export const requireCurrentUser = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("not_authenticated");
  const me = await getUserByExternalId(ctx, identity.subject);
  if (!me) throw new ConvexError("user_not_found");
  return me;
};
