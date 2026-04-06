interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

interface ClerkDeletedPayload {
  id: string;
  deleted: boolean;
}

export type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserPayload }
  | { type: "user.updated"; data: ClerkUserPayload }
  | { type: "user.deleted"; data: ClerkDeletedPayload };

export type ParsedClerkEvent =
  | {
      type: "userCreated";
      args: {
        externalAuthId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        profilePictureUrl?: string;
      };
    }
  | {
      type: "userUpdated";
      args: {
        externalAuthId: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        profilePictureUrl?: string;
      };
    }
  | { type: "userDeleted"; args: { externalAuthId: string } };

function resolvePrimaryEmail(
  email_addresses: ClerkEmailAddress[],
  primary_email_address_id: string,
): string | undefined {
  return email_addresses.find((e) => e.id === primary_email_address_id)?.email_address;
}

export function parseClerkEvent(event: ClerkWebhookEvent): ParsedClerkEvent | null {
  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
        event.data;

      return {
        type: "userCreated",
        args: {
          externalAuthId: id,
          email: resolvePrimaryEmail(email_addresses, primary_email_address_id) ?? "",
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          profilePictureUrl: image_url ?? undefined,
        },
      };
    }
    case "user.updated": {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
        event.data;

      return {
        type: "userUpdated",
        args: {
          externalAuthId: id,
          email: resolvePrimaryEmail(email_addresses, primary_email_address_id),
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          profilePictureUrl: image_url ?? undefined,
        },
      };
    }
    case "user.deleted":
      return {
        type: "userDeleted",
        args: { externalAuthId: event.data.id },
      };
    default:
      return null;
  }
}
