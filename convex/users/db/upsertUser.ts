import { MutationCtx } from "@convex/_generated/server";

import { getUserByExternalId } from "./getUser";

export const upsertUser = async (
  ctx: MutationCtx,
  args: {
    externalAuthId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  },
) => {
  const existing = await getUserByExternalId(ctx, args.externalAuthId);
  if (existing) return existing._id;
  const { phone, ...rest } = args;
  return ctx.db.insert("users", {
    ...rest,
    ...(phone ? { phone } : {}),
    hasCompletedOnboarding: false,
    isPublic: false,
  });
};
