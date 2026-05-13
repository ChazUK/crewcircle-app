"use node";

import { render } from "@react-email/render";
import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import { appBaseUrl } from "./appBaseUrl";
import { ContactInviteEmail } from "./ContactInviteEmail";
import { fromAddress } from "./fromAddress";
import { resendClient } from "./resendClient";

export const sendContactInviteEmail = internalAction({
  args: {
    inviteId: v.id("contactInvites"),
    recipientEmail: v.string(),
    inviterName: v.string(),
    inviterEmail: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const acceptUrl = `${appBaseUrl()}/invite/${args.inviteId}`;

    const element = ContactInviteEmail({
      inviterName: args.inviterName,
      inviterEmail: args.inviterEmail,
      recipientEmail: args.recipientEmail,
      acceptUrl,
      ...(args.message ? { message: args.message } : {}),
    });
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

    const resend = resendClient();
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: args.recipientEmail,
      subject: `${args.inviterName} invited you to join Crew Circle`,
      html,
      text,
    });

    if (error) {
      console.error("[sendContactInviteEmail] Resend error:", error);
      throw new Error(`Resend failed: ${error.message ?? "unknown error"}`);
    }
  },
});
