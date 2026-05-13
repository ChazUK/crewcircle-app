import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";

export const useRemoveContact = () => {
  const removeContact = useMutation(api.contacts.mutations.removeContact);
  return (contactUserId: Id<"users">) => removeContact({ contactUserId });
};
