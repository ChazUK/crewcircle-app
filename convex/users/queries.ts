import { query } from "../_generated/server";
import { getUserByExternalId } from "./db/getUser";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return getUserByExternalId(ctx, identity.subject);
  },
});
