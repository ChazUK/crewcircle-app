import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getUserByExternalId } from "../../users/db/getUser";
import { resolveProfileVisibility } from "../../users/lib/resolveProfileVisibility";
import { fetchSortedMemberships } from "../db/fetchSortedMemberships";

export const listMembershipsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await getUserByExternalId(ctx, identity.subject) : null;

    const subject = await ctx.db.get(args.userId);
    if (!subject) return [];

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

    if (visibility.mode !== "self" && visibility.mode !== "contact") return [];

    return fetchSortedMemberships(ctx, args.userId);
  },
});
