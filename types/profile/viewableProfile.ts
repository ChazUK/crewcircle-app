import type { Id } from "@convex/_generated/dataModel";

type ProfileIdentity = {
  userId: Id<"users">;
  firstName: string | undefined;
  lastName: string | undefined;
  nickname: string | undefined;
  profilePictureUrl: string | undefined;
};

type CrewProfile = ProfileIdentity & { userType: "crew" };
type ProductionManagerProfile = ProfileIdentity & {
  userType: "production-manager";
};

export type ViewableProfile =
  | ({ mode: "self" } & CrewProfile)
  | ({ mode: "contact" } & CrewProfile)
  | ({ mode: "public-card" } & CrewProfile)
  | ({ mode: "pm-self" } & ProductionManagerProfile)
  | ({ mode: "pm-job-linked" } & ProductionManagerProfile);
