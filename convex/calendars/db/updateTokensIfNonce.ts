import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

// Atomically refresh OAuth tokens only when the caller holds the current nonce.
// Two concurrent cron actions can race to refresh the same connection's tokens.
// The first writer sets a new nonce; the second's expectedNonce no longer matches,
// so it returns false and reads the freshly written token instead of overwriting it.
export const updateTokensIfNonce = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    expectedNonce: v.optional(v.string()),
    encryptedTokens: v.bytes(),
    tokenExpiresAt: v.number(),
    newNonce: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return false;
    if (connection.refreshNonce !== args.expectedNonce) return false;
    await ctx.db.patch(args.connectionId, {
      encryptedTokens: args.encryptedTokens,
      tokenExpiresAt: args.tokenExpiresAt,
      refreshNonce: args.newNonce,
    });
    return true;
  },
});
