import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { getUserByExternalId } from "./db/getUser";
import { resolveProfileVisibility } from "./lib/resolveProfileVisibility";

async function resolveStorageUrl(
  ctx: QueryCtx,
  fileId: Id<"_storage"> | undefined,
): Promise<string | undefined> {
  if (!fileId) return undefined;
  return (await ctx.storage.getUrl(fileId)) ?? undefined;
}

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

    const profilePictureUrl = await resolveStorageUrl(ctx, viewer.profilePictureFileId);

    if (viewer.userType === "crew") {
      const cvUrl = await resolveStorageUrl(ctx, viewer.cvFileId);
      return {
        mode: "self",
        isPublic: viewer.isPublic ?? false,
        userId: viewer._id,
        firstName: viewer.firstName,
        lastName: viewer.lastName,
        nickname: viewer.nickname,
        profilePictureUrl,
        userType: "crew",
        department: viewer.department,
        roles: viewer.roles,
        bio: viewer.bio,
        website: viewer.website,
        imdbId: viewer.imdbId,
        cvUrl,
        city: viewer.city,
        country: viewer.country,
        startYearInDepartment: viewer.startYearInDepartment,
        productionTypes: viewer.productionTypes,
        spokenLanguages: viewer.spokenLanguages,
        passports: viewer.passports,
        drivingLicences: viewer.drivingLicences,
        workEligibility: viewer.workEligibility,
      };
    }

    return {
      mode: "pm-self",
      userId: viewer._id,
      firstName: viewer.firstName,
      lastName: viewer.lastName,
      nickname: viewer.nickname,
      profilePictureUrl,
      userType: "production-manager",
    };
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

    const profilePictureUrl = await resolveStorageUrl(ctx, subject.profilePictureFileId);

    if (subject.userType === "crew") {
      const mode = visibility.mode as "self" | "contact" | "public-card";
      const base = {
        userId: subject._id,
        firstName: subject.firstName,
        lastName: subject.lastName,
        nickname: subject.nickname,
        profilePictureUrl,
        userType: "crew" as const,
        department: subject.department,
        roles: subject.roles,
        city: subject.city,
        country: subject.country,
      };
      if (mode === "public-card") {
        return { mode, ...base };
      }
      const cvUrl = await resolveStorageUrl(ctx, subject.cvFileId);
      const crewExtras = {
        ...base,
        bio: subject.bio,
        website: subject.website,
        imdbId: subject.imdbId,
        cvUrl,
        startYearInDepartment: subject.startYearInDepartment,
        productionTypes: subject.productionTypes,
        spokenLanguages: subject.spokenLanguages,
        passports: subject.passports,
        drivingLicences: subject.drivingLicences,
        workEligibility: subject.workEligibility,
      };
      if (mode === "self") {
        return { mode, isPublic: subject.isPublic ?? false, ...crewExtras };
      }
      return { mode, ...crewExtras };
    }

    const userType = subject.userType as "production-manager";
    return {
      mode: visibility.mode as "pm-self" | "pm-job-linked",
      userId: subject._id,
      firstName: subject.firstName,
      lastName: subject.lastName,
      nickname: subject.nickname,
      profilePictureUrl,
      userType,
    };
  },
});
