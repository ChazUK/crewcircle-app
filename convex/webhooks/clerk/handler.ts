import { internal } from "@convex/api";
import { httpAction } from "@convex/server";
import { Webhook } from "svix";

import { ClerkWebhookEvent, parseClerkEvent } from "./parse";

export const handleClerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) return new Response("Webhook secret not configured", { status: 500 });

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature)
    return new Response("Missing svix headers", { status: 400 });

  const body = await request.text();

  let event: ClerkWebhookEvent;

  try {
    const wh = new Webhook(webhookSecret);

    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err instanceof Error ? err.message : String(err));
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const parsed = parseClerkEvent(event);

  if (!parsed) {
    console.log("Ignoring unhandled Clerk event type:", event.type);
    return new Response(null, { status: 200 });
  }

  switch (parsed.type) {
    case "userCreated":
      await ctx.runMutation(internal.users.webhooks.userCreated, parsed.args);
      break;
    case "userUpdated":
      await ctx.runMutation(internal.users.webhooks.userUpdated, parsed.args);
      break;
    case "userDeleted":
      await ctx.runMutation(internal.users.webhooks.userDeleted, parsed.args);
      break;
  }

  return new Response(null, { status: 200 });
});
