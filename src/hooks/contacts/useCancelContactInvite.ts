import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";

export const useCancelContactInvite = () => {
  const cancelContactInvite = useMutation(api.contacts.mutations.cancelContactInvite);
  return (inviteId: Id<"contactInvites">) => cancelContactInvite({ inviteId });
};
