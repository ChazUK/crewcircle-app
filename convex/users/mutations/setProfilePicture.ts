import { ConvexError, v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png"]);

type FileMetadata = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
};

export const setProfilePicture = mutation({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
    if (!metadata) throw new ConvexError("File not found");

    if (!ALLOWED_MIMES.has(metadata.contentType ?? "")) {
      throw new ConvexError("Only JPEG and PNG images are allowed");
    }
    if (metadata.size > MAX_SIZE) {
      throw new ConvexError("Image must be 5 MB or smaller");
    }

    const previousFileId = user.profilePictureFileId;
    if (previousFileId === args.fileId) return;

    await ctx.db.patch(user._id, { profilePictureFileId: args.fileId });

    if (previousFileId) {
      await ctx.storage.delete(previousFileId);
    }
  },
});
