import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@convex/server", () => ({
  httpAction: (fn: unknown) => fn,
}));

vi.mock("@convex/api", () => ({
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
    });

    test("returns 500 when mutation throws", async () => {
      mockVerifyWebhook.mockResolvedValue({ type: "user.created", data: userPayload });
      ctx.runMutation.mockRejectedValue(new Error("Database error"));
      const response = await handler(
        ctx,
        makeRequest(JSON.stringify({ type: "user.created", data: userPayload })),
      );
      expect(response.status).toBe(500);
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
      expect(ctx.runMutation).toHaveBeenCalledWith("users:webhooks:userCreated", {
        externalAuthId: "user_abc",
        email: "test@example.com",
        firstName: "Alice",
        lastName: "Smith",
        profilePictureUrl: "https://example.com/pic.jpg",
      });
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
