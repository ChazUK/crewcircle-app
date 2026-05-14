import { describe, expect, test } from "vitest";

import type { Id } from "../../_generated/dataModel";
import { resolveProfileVisibility } from "./resolveProfileVisibility";

const userId1 = "userId1" as Id<"users">;
const userId2 = "userId2" as Id<"users">;

describe("resolveProfileVisibility", () => {
  test("viewer is same crew user as subject → self", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId1, userType: "crew", isPublic: false },
        isContact: false,
      }),
    ).toEqual({ mode: "self" });
  });

  test("viewer is same PM user as subject → pm-self", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId1, userType: "production-manager", isPublic: false },
        isContact: false,
      }),
    ).toEqual({ mode: "pm-self" });
  });

  test("subject is PM other than viewer → hidden", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId2, userType: "production-manager", isPublic: false },
        isContact: false,
      }),
    ).toEqual({ mode: "hidden" });
  });

  test("subject is crew, viewer is different, isContact true → contact", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId2, userType: "crew", isPublic: false },
        isContact: true,
      }),
    ).toEqual({ mode: "contact" });
  });

  test("subject is crew, viewer is different, isContact false, isPublic true → public-card", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId2, userType: "crew", isPublic: true },
        isContact: false,
      }),
    ).toEqual({ mode: "public-card" });
  });

  test("subject is crew, viewer is different, isContact false, isPublic false → hidden", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId2, userType: "crew", isPublic: false },
        isContact: false,
      }),
    ).toEqual({ mode: "hidden" });
  });

  test("subject has undefined userType → hidden", () => {
    expect(
      resolveProfileVisibility({
        viewerUserId: userId1,
        subject: { _id: userId2, userType: undefined, isPublic: false },
        isContact: false,
      }),
    ).toEqual({ mode: "hidden" });
  });
});
