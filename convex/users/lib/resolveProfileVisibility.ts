import type { ProfileVisibility } from "@shared/profile/visibilityMode";

import type { Id } from "../../_generated/dataModel";

type Args = {
  viewerUserId: Id<"users"> | null;
  subject: {
    _id: Id<"users">;
    userType: "crew" | "production-manager" | undefined;
    isPublic: boolean | undefined;
  };
  isContact: boolean;
};

export function resolveProfileVisibility(args: Args): ProfileVisibility {
  const { viewerUserId, subject, isContact } = args;

  if (subject.userType === undefined) {
    return { mode: "hidden" };
  }

  if (viewerUserId === subject._id && subject.userType === "crew") {
    return { mode: "self" };
  }

  if (viewerUserId === subject._id && subject.userType === "production-manager") {
    return { mode: "pm-self" };
  }

  if (subject.userType === "production-manager") {
    return { mode: "hidden" };
  }

  if (isContact === true) {
    return { mode: "contact" };
  }

  if (subject.isPublic === true) {
    return { mode: "public-card" };
  }

  return { mode: "hidden" };
}
