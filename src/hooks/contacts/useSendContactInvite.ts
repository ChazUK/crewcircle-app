import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";

export const useSendContactInvite = () => {
  const sendContactInvite = useMutation(api.contacts.mutations.sendContactInvite);
  return (args: { targetUserId?: Id<"users">; email?: string; phone?: string; message?: string }) =>
    sendContactInvite(args);
};
