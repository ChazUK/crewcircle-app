import { MutationCtx } from "@convex/_generated/server";

import { scheduleDeleteUserCalendarData } from "../../calendars/db/cascadeDelete";
import { getUserByExternalId } from "../db/getUser";
import { upsertUser } from "../db/upsertUser";

export const createUser = (
  ctx: MutationCtx,
  args: {
    externalAuthId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  },
) => upsertUser(ctx, args);

export const updateUser = async (
  ctx: MutationCtx,
  {
    externalAuthId,
    ...fields
  }: {
    externalAuthId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  },
) => {
  const user = await getUserByExternalId(ctx, externalAuthId);

  if (!user) return null;

  const updates = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  await ctx.db.patch(user._id, updates);

  return user._id;
};

export const deleteUser = async (
  ctx: MutationCtx,
  { externalAuthId }: { externalAuthId: string },
) => {
  const user = await getUserByExternalId(ctx, externalAuthId);

  if (!user) return null;

  // Clerk's user.deleted webhook fires this; cascade so the user's calendar
  // connections and cached events go with them. Connection deletion runs in
  // scheduled mutations so it scales past a single transaction's budget.
  await scheduleDeleteUserCalendarData(ctx, user._id);
  await ctx.db.delete(user._id);

  return true;
};
