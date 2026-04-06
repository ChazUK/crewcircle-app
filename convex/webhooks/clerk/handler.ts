import { verifyWebhook } from "@clerk/backend/webhooks";
import { internal } from "@convex/api";
import { httpAction } from "@convex/server";

export const handleClerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) return new Response("Webhook secret not configured", { status: 500 });

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request, { signingSecret: webhookSecret });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created": {
        const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
          event.data;

        const email = resolvePrimaryEmail(email_addresses, primary_email_address_id);
        if (!email) {
          console.warn(
            `user.created webhook received for user ${id} with no primary email — skipping`,
          );
          break;
        }

        await ctx.runMutation(internal.users.webhooks.userCreated, {
          externalAuthId: id,
          email,
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          profilePictureUrl: image_url ?? undefined,
        });
        break;
      }
      case "user.updated": {
        const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
          event.data;

        await ctx.runMutation(internal.users.webhooks.userUpdated, {
          externalAuthId: id,
          email: resolvePrimaryEmail(email_addresses, primary_email_address_id),
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          profilePictureUrl: image_url ?? undefined,
        });
        break;
      }
      case "user.deleted": {
        const { id } = event.data;

        if (!id) break;
        await ctx.runMutation(internal.users.webhooks.userDeleted, {
          externalAuthId: id,
        });
        break;
      }
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return new Response("Webhook processing failed", { status: 500 });
  }
});

function resolvePrimaryEmail(
  email_addresses: { id: string; email_address: string }[],
  primary_email_address_id: string | null,
): string | undefined {
  return email_addresses.find((e) => e.id === primary_email_address_id)?.email_address;
}
