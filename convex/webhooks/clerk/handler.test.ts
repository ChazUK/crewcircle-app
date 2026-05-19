import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@convex/_generated/server", () => ({
  httpAction: (fn: unknown) => fn,
}));

vi.mock("@convex/_generated/api", () => ({
  internal: {
    users: {
      webhooks: {
        userCreated: "users:webhooks:userCreated",
        userUpdated: "users:webhooks:userUpdated",
        userDeleted: "users:webhooks:userDeleted",
      },
    },
  },
}));

const mockVerifyWebhook = vi.hoisted(() => vi.fn());
vi.mock("@clerk/backend/webhooks", () => ({
  verifyWebhook: mockVerifyWebhook,
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type HandlerFn = (
  ctx: { runMutation: ReturnType<typeof vi.fn> },
  request: Request,
) => Promise<Response>;

const { handleClerkWebhook } = await import("./handler");
const handler = handleClerkWebhook as unknown as HandlerFn;

function makeRequest(body: string) {
  // svix-id/svix-timestamp/svix-signature headers intentionally omitted — verifyWebhook is mocked
  return new Request("https://example.com/webhooks/clerk", {
    method: "POST",
    body,
  });
}

const userPayload = {
  id: "user_abc",
  email_addresses: [{ id: "email_1", email_address: "test@example.com" }],
  primary_email_address_id: "email_1",
  first_name: "Alice",
  last_name: "Smith",
  image_url: "https://example.com/pic.jpg",
};

describe("handleClerkWebhook", () => {
  let ctx: { runMutation: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ctx = { runMutation: vi.fn() };
    mockVerifyWebhook.mockReset();
    vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("error cases", () => {
    test("returns 500 when webhook secret is not configured", async () => {
      vi.stubEnv("CLERK_WEBHOOK_SECRET", "");
      const response = await handler(ctx, makeRequest("{}"));
      expect(response.status).toBe(500);
    });

    test("returns 400 when webhook verification fails", async () => {
      mockVerifyWebhook.mockRejectedValue(new Error("Invalid signature"));
      const response = await handler(ctx, makeRequest("{}"));
      expect(response.status).toBe(400);
      expect(console.error).toHaveBeenCalledWith("Webhook verification failed:", expect.any(Error));
    });

    test("returns 500 when mutation throws", async () => {
      mockVerifyWebhook.mockResolvedValue({ type: "user.created", data: userPayload });
      ctx.runMutation.mockRejectedValue(new Error("Database error"));
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.created", data: userPayload })),
      );
      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith("Webhook processing failed:", expect.any(Error));
    });
  });

  describe("user.created", () => {
    test("calls userCreated mutation and returns 200", async () => {
      mockVerifyWebhook.mockResolvedValue({ type: "user.created", data: userPayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.created", data: userPayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledOnce();
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userCreated",
        expect.objectContaining({
          externalAuthId: "user_abc",
          email: "test@example.com",
          firstName: "Alice",
          lastName: "Smith",
          profilePictureUrl: "https://example.com/pic.jpg",
          phone: "",
        }),
      );
    });

    test("skips mutation and returns 200 when primary email is missing", async () => {
      const noEmailPayload = {
        ...userPayload,
        email_addresses: [],
        primary_email_address_id: null,
      };
      mockVerifyWebhook.mockResolvedValue({ type: "user.created", data: noEmailPayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.created", data: noEmailPayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).not.toHaveBeenCalled();
    });

    test("calls userCreated with verified primary phone as E.164 string", async () => {
      const withPhonePayload = {
        ...userPayload,
        phone_numbers: [
          { id: "phone_1", phone_number: "+447700900000", verification: { status: "verified" } },
        ],
        primary_phone_number_id: "phone_1",
      };
      mockVerifyWebhook.mockResolvedValue({ type: "user.created", data: withPhonePayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.created", data: withPhonePayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userCreated",
        expect.objectContaining({ phone: "+447700900000" }),
      );
    });
  });

  describe("user.updated", () => {
    test("calls userUpdated mutation and returns 200", async () => {
      mockVerifyWebhook.mockResolvedValue({ type: "user.updated", data: userPayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.updated", data: userPayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledOnce();
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userUpdated",
        expect.objectContaining({
          externalAuthId: "user_abc",
          email: "test@example.com",
        }),
      );
    });

    test("calls userUpdated with email undefined when primary email is missing", async () => {
      const noEmailPayload = {
        ...userPayload,
        email_addresses: [],
        primary_email_address_id: null,
      };
      mockVerifyWebhook.mockResolvedValue({ type: "user.updated", data: noEmailPayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.updated", data: noEmailPayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledOnce();
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userUpdated",
        expect.objectContaining({ externalAuthId: "user_abc", email: undefined }),
      );
    });

    test("calls userUpdated with verified primary phone as E.164 string", async () => {
      const withPhonePayload = {
        ...userPayload,
        phone_numbers: [
          { id: "phone_1", phone_number: "+447700900001", verification: { status: "verified" } },
        ],
        primary_phone_number_id: "phone_1",
      };
      mockVerifyWebhook.mockResolvedValue({ type: "user.updated", data: withPhonePayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.updated", data: withPhonePayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userUpdated",
        expect.objectContaining({ phone: "+447700900001" }),
      );
    });

    test("calls userUpdated with phone '' when primary_phone_number_id is null", async () => {
      const noPhonePayload = {
        ...userPayload,
        phone_numbers: [],
        primary_phone_number_id: null,
      };
      mockVerifyWebhook.mockResolvedValue({ type: "user.updated", data: noPhonePayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.updated", data: noPhonePayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userUpdated",
        expect.objectContaining({ phone: "" }),
      );
    });

    test("calls userUpdated with phone '' when primary phone verification is not verified", async () => {
      const unverifiedPhonePayload = {
        ...userPayload,
        phone_numbers: [
          { id: "phone_1", phone_number: "+447700900002", verification: { status: "unverified" } },
        ],
        primary_phone_number_id: "phone_1",
      };
      mockVerifyWebhook.mockResolvedValue({ type: "user.updated", data: unverifiedPhonePayload });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.updated", data: unverifiedPhonePayload })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        "users:webhooks:userUpdated",
        expect.objectContaining({ phone: "" }),
      );
    });
  });

  describe("unknown event types", () => {
    test("ignores unknown event type and returns 200", async () => {
      mockVerifyWebhook.mockResolvedValue({ type: "user.signed_in", data: { id: "user_abc" } });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.signed_in", data: { id: "user_abc" } })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).not.toHaveBeenCalled();
    });
  });

  describe("user.deleted", () => {
    test("calls userDeleted mutation and returns 200", async () => {
      mockVerifyWebhook.mockResolvedValue({
        type: "user.deleted",
        data: { id: "user_del", deleted: true },
      });
      const response = await handler(
        ctx,
        makeRequest(
          JSON.stringify({ type: "user.deleted", data: { id: "user_del", deleted: true } }),
        ),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).toHaveBeenCalledOnce();
      expect(ctx.runMutation).toHaveBeenCalledWith("users:webhooks:userDeleted", {
        externalAuthId: "user_del",
      });
    });

    test("skips mutation and returns 200 when deleted user has no id", async () => {
      mockVerifyWebhook.mockResolvedValue({ type: "user.deleted", data: { deleted: true } });
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.deleted", data: { deleted: true } })),
      );
      expect(response.status).toBe(200);
      expect(ctx.runMutation).not.toHaveBeenCalled();
    });
  });
});
