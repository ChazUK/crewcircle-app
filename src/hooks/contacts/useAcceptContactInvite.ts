import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";

export const useAcceptContactInvite = () => {
  const acceptContactInvite = useMutation(api.contacts.mutations.acceptContactInvite);
  return (inviteId: Id<"contactInvites">) => acceptContactInvite({ inviteId });
};
