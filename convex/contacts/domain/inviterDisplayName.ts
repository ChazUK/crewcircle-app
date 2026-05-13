import { Doc } from "@convex/_generated/dataModel";

export const inviterDisplayName = (user: Doc<"users">): string => {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return user.email;
};
