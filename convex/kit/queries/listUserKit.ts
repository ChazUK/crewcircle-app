import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getUserByExternalId } from "../../users/db/getUser";
import { resolveProfileVisibility } from "../../users/lib/resolveProfileVisibility";

export const listUserKit = query({
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

    const userKitRows = await ctx.db
      .query("userKit")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    const items = await Promise.all(
      userKitRows.map(async (row) => {
        const catalogue = await ctx.db.get(row.kitCatalogueId);
        if (!catalogue) return null;
        return { id: row._id, name: catalogue.name };
      }),
    );

    return items.filter((item) => item !== null).sort((a, b) => a.name.localeCompare(b.name));
  },
});
