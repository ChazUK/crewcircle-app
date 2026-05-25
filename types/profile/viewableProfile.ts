import type { Id } from "@convex/_generated/dataModel";

import { LanguageProficiencyLevel } from "@/lib/languages/language-proficiency-levels";

import type { Department } from "../departments/departments";
import { LanguageCode } from "./languages";

type ProfileIdentity = {
  userId: Id<"users">;
  firstName: string;
  lastName: string;
  nickname?: string;
  profilePictureUrl?: string;
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

export type SpokenLanguageEntry = {
  code: LanguageCode;
  fluency: LanguageProficiencyLevel;
};

type KitEntry = {
  id: string;
  name: string;
};

export type CertificationEntry = {
  id: string;
  name: string;
  issuer: string | undefined;
  referenceNumber: string | undefined;
  expiresAt: number | undefined;
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
  kit: KitEntry[] | undefined;
  certifications: CertificationEntry[] | undefined;
  memberships: MembershipEntry[] | undefined;
};

type CrewProfile = ProfileIdentity & {
  userType: "crew";
  department: Department | undefined;
  roles: string[] | undefined;
};

type ProductionManagerProfile = ProfileIdentity &
  Location & {
    userType: "production-manager";
    productionCompany: string | undefined;
    bio: string | undefined;
    website: string | undefined;
  };

export type ViewableProfile =
  | ({ mode: "self"; isPublic: boolean } & CrewProfile & BioLinks & Location & CrewExtras)
  | ({ mode: "contact" } & CrewProfile & BioLinks & Location & CrewExtras)
  | ({ mode: "public-card" } & CrewProfile & Location)
  | ({ mode: "pm-self" } & ProductionManagerProfile)
  | ({ mode: "pm-job-linked" } & ProductionManagerProfile);

export type Profile = CrewProfile & {
  city: string | undefined;
  country: string | undefined;
  bio?: string;
  website?: string;
  imdbId?: string;
  cvUrl?: string;
  certifications?: CertificationEntry[];
  department?: Department;
  roles?: string[];
  drivingLicences?: string[];
  kit?: KitEntry[];
  spokenLanguages?: SpokenLanguageEntry[];
};
