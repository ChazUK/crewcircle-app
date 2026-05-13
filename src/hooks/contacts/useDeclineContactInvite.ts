import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";

export const useDeclineContactInvite = () => {
  const declineContactInvite = useMutation(api.contacts.mutations.declineContactInvite);
  return (inviteId: Id<"contactInvites">) => declineContactInvite({ inviteId });
};
