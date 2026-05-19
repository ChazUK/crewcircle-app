import { createClerkClient } from "@clerk/backend";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";

export const syncVerifiedPhone = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(identity.subject);

    const { primaryPhoneNumberId, phoneNumbers } = clerkUser;

    const primaryPhone = phoneNumbers.find(
      (p) => p.id === primaryPhoneNumberId && p.verification?.status === "verified",
    );

    if (!primaryPhone) throw new Error("No verified primary phone on Clerk user.");

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );

    await ctx.runMutation(internal.users.webhooks.userUpdated, {
      externalAuthId: clerkUser.id,
      email: primaryEmail?.emailAddress,
      firstName: clerkUser.firstName ?? undefined,
      lastName: clerkUser.lastName ?? undefined,
      phone: primaryPhone.phoneNumber,
    });

    return null;
  },
});
