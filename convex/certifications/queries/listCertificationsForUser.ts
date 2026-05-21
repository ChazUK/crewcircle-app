import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getUserByExternalId } from "../../users/db/getUser";
import { resolveProfileVisibility } from "../../users/lib/resolveProfileVisibility";

export const listCertificationsForUser = query({
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

    const rows = await ctx.db
      .query("certifications")
      .withIndex("byUserIdAndExpiresAt", (q) => q.eq("userId", args.userId))
      .collect();

    const withExpiry = rows.filter((r) => r.expiresAt !== undefined);
    const withoutExpiry = rows.filter((r) => r.expiresAt === undefined);
    withExpiry.sort((a, b) => (a.expiresAt as number) - (b.expiresAt as number));

    return [...withExpiry, ...withoutExpiry].map((r) => ({
      id: r._id,
      name: r.name,
      issuer: r.issuer,
      referenceNumber: r.referenceNumber,
      expiresAt: r.expiresAt,
    }));
  },
});
