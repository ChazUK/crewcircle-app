import type { Profile } from "@shared/profile/viewableProfile";
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { fetchSortedCertifications } from "../certifications/db/fetchSortedCertifications";
import { fetchSortedMemberships } from "../memberships/db/fetchSortedMemberships";
import { getUserByExternalId } from "./db/getUser";
import { resolveProfileVisibility } from "./lib/resolveProfileVisibility";

async function resolveStorageUrl(
  ctx: QueryCtx,
  fileId: Id<"_storage"> | undefined,
): Promise<string | undefined> {
  if (!fileId) return undefined;
  return (await ctx.storage.getUrl(fileId)) ?? undefined;
}

async function hydrateKit(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("userKit")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .collect();

  const items = await Promise.all(
    rows.map(async (row) => {
      const catalogue = await ctx.db.get(row.kitCatalogueId);
      if (!catalogue) return null;
      return { id: row._id as string, name: catalogue.name };
    }),
  );

  const filtered = items.filter((item): item is { id: string; name: string } => item !== null);

  return filtered.length > 0 ? filtered.sort((a, b) => a.name.localeCompare(b.name)) : undefined;
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
  handler: async (ctx): Promise<Profile | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const viewer = await getUserByExternalId(ctx, identity.subject);
    if (!viewer) return null;

    if (viewer.userType === undefined) return null;

    const profilePictureUrl = await resolveStorageUrl(ctx, viewer.profilePictureFileId);

    if (viewer.userType === "crew") {
      const cvUrl = await resolveStorageUrl(ctx, viewer.cvFileId);
      const kit = await hydrateKit(ctx, viewer._id);
      const sortedCerts = await fetchSortedCertifications(ctx, viewer._id);
      const certifications = sortedCerts.length > 0 ? sortedCerts : undefined;
      const sortedMemberships = await fetchSortedMemberships(ctx, viewer._id);
      const memberships = sortedMemberships.length > 0 ? sortedMemberships : undefined;

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
        spokenLanguages: viewer.spokenLanguages,
        passports: viewer.passports,
        drivingLicences: viewer.drivingLicences,
        workEligibility: viewer.workEligibility,
        kit,
        certifications,
        memberships,
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
      city: viewer.city,
      country: viewer.country,
      productionCompany: viewer.productionCompany,
      bio: viewer.bio,
      website: viewer.website,
    };
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Profile | null> => {
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
      const kit = await hydrateKit(ctx, subject._id);
      const sortedCerts = await fetchSortedCertifications(ctx, subject._id);
      const certifications = sortedCerts.length > 0 ? sortedCerts : undefined;
      const sortedMemberships = await fetchSortedMemberships(ctx, subject._id);
      const memberships = sortedMemberships.length > 0 ? sortedMemberships : undefined;
      const crewExtras = {
        ...base,
        bio: subject.bio,
        website: subject.website,
        imdbId: subject.imdbId,
        cvUrl,
        spokenLanguages: subject.spokenLanguages,
        passports: subject.passports,
        drivingLicences: subject.drivingLicences,
        workEligibility: subject.workEligibility,
        kit,
        certifications,
        memberships,
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
      city: subject.city,
      country: subject.country,
      productionCompany: subject.productionCompany,
      bio: subject.bio,
      website: subject.website,
    };
  },
});
