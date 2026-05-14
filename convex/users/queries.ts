import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { v } from "convex/values";

import { query } from "../_generated/server";
import { getUserByExternalId } from "./db/getUser";
import { resolveProfileVisibility } from "./lib/resolveProfileVisibility";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return getUserByExternalId(ctx, identity.subject);
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx): Promise<ViewableProfile | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const viewer = await getUserByExternalId(ctx, identity.subject);
    if (!viewer) return null;

    if (viewer.userType === undefined) return null;

    return {
      mode: viewer.userType === "crew" ? "self" : "pm-self",
      userId: viewer._id,
      firstName: viewer.firstName,
      lastName: viewer.lastName,
      nickname: viewer.nickname,
      profilePictureUrl: viewer.profilePictureUrl,
      userType: viewer.userType,
    } as ViewableProfile;
  },
});

export const getViewableProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<ViewableProfile | null> => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await getUserByExternalId(ctx, identity.subject) : null;

    const subject = await ctx.db.get(args.userId);
    if (!subject) return null;

    let isContact = false;
    if (viewer !== null) {
      const result = await ctx.db
        .query("contacts")
        .withIndex("byOwnerAndContact", (q) =>
          q.eq("ownerId", viewer._id).eq("contactUserId", subject._id),
        )
        .unique();
      isContact = result !== null;
    }

    const visibility = resolveProfileVisibility({
      viewerUserId: viewer?._id ?? null,
      subject: { _id: subject._id, userType: subject.userType, isPublic: subject.isPublic },
      isContact,
    });

    if (visibility.mode === "hidden") return null;

    const userType = subject.userType as "crew" | "production-manager";

    return {
      mode: visibility.mode,
      userId: subject._id,
      firstName: subject.firstName,
      lastName: subject.lastName,
      nickname: subject.nickname,
      profilePictureUrl: subject.profilePictureUrl,
      userType,
    } as ViewableProfile;
  },
});
