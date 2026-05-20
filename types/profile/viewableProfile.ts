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

type CrewExtras = {
  startYearInDepartment: number | undefined;
  productionTypes: string[] | undefined;
  spokenLanguages: SpokenLanguageEntry[] | undefined;
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
