import { ConvexError } from "convex/values";

import { mutation } from "../../_generated/server";

export const generateProfilePictureUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
