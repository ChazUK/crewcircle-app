import type { Id } from "@convex/_generated/dataModel";

import type { Department } from "../departments/departments";

type ProfileIdentity = {
  userId: Id<"users">;
  firstName: string | undefined;
  lastName: string | undefined;
  nickname: string | undefined;
  profilePictureUrl: string | undefined;
};

type Location = {
  city: string | undefined;
  country: string | undefined;
};

type BioLinks = {
  bio: string | undefined;
  website: string | undefined;
  imdbId: string | undefined;
  cvUrl: string | undefined;
};

type SpokenLanguageEntry = {
  code: string;
  fluency: string;
};

export type MembershipEntry = {
  id: string;
  name: string;
  memberNumber: string | undefined;
};

type CrewExtras = {
  startYearInDepartment: number | undefined;
  productionTypes: string[] | undefined;
  spokenLanguages: SpokenLanguageEntry[] | undefined;
  passports: string[] | undefined;
  drivingLicences: string[] | undefined;
  workEligibility: string[] | undefined;
  memberships: MembershipEntry[] | undefined;
};

type CrewProfile = ProfileIdentity & {
  userType: "crew";
  department: Department | undefined;
  roles: string[] | undefined;
};

type ProductionManagerProfile = ProfileIdentity & {
  userType: "production-manager";
};

export type ViewableProfile =
  | ({ mode: "self"; isPublic: boolean } & CrewProfile & BioLinks & Location & CrewExtras)
  | ({ mode: "contact" } & CrewProfile & BioLinks & Location & CrewExtras)
  | ({ mode: "public-card" } & CrewProfile & Location)
  | ({ mode: "pm-self" } & ProductionManagerProfile)
  | ({ mode: "pm-job-linked" } & ProductionManagerProfile);
