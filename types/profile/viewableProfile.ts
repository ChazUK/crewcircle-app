import type { Id } from "@convex/_generated/dataModel";

import { LanguageProficiencyLevel } from "@/lib/languages/language-proficiency-levels";

import type { CountryCode } from "../countries/countries";
import type { Department } from "../departments/departments";
import { LanguageCode } from "./languages";

export type SpokenLanguageEntry = {
  code: LanguageCode;
  fluency: LanguageProficiencyLevel;
};

export type KitEntry = {
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

export type Profile = {
  userId: Id<"users">;
  firstName: string;
  lastName: string;
  nickname?: string;
  profilePictureUrl?: string;
  city?: string;
  country?: CountryCode;
  bio?: string | undefined;
  website?: string | undefined;
  department?: Department;
  roles?: string[];
  imdbId?: string;
  cvUrl?: string;
  certifications?: CertificationEntry[];
  memberships?: MembershipEntry[];
  passports?: CountryCode[];
  drivingLicences?: string[];
  kit?: KitEntry[];
  spokenLanguages?: SpokenLanguageEntry[];
  workEligibility?: string[];
  startYearInDepartment?: number;
  productionCompany: string | undefined;
};
