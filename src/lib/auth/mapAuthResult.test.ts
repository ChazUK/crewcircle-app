import type { AuthSessionResult } from "expo-auth-session";
import { describe, expect, test } from "vitest";

import { mapAuthResult } from "./mapAuthResult";

const success = (code: string | undefined): AuthSessionResult =>
  ({
    type: "success",
    params: code !== undefined ? { code } : {},
    url: "",
    error: null,
    authentication: null,
  }) as AuthSessionResult;

describe("mapAuthResult", () => {
  test("success with valid code and verifier returns success result", () => {
    expect(mapAuthResult(success("auth-code-123"), "verifier-abc")).toEqual({
      success: true,
      authCode: "auth-code-123",
      codeVerifier: "verifier-abc",
    });
  });

  test("success but missing code returns failure", () => {
    expect(mapAuthResult(success(undefined), "verifier-abc")).toEqual({
      success: false,
      error: "OAuth flow failed",
    });
  });

  test("success but missing codeVerifier returns failure", () => {
    expect(mapAuthResult(success("auth-code-123"), undefined)).toEqual({
      success: false,
      error: "OAuth flow failed",
    });
  });

  test("cancel returns user cancelled error", () => {
    expect(mapAuthResult({ type: "cancel" } as AuthSessionResult, "verifier-abc")).toEqual({
      success: false,
      error: "User cancelled",
    });
  });

  test("dismiss returns generic failure", () => {
    expect(mapAuthResult({ type: "dismiss" } as AuthSessionResult, "verifier-abc")).toEqual({
      success: false,
      error: "OAuth flow failed",
    });
  });

  test("error result returns generic failure", () => {
    expect(
      mapAuthResult({ type: "error", error: null, url: "" } as AuthSessionResult, "verifier-abc"),
    ).toEqual({
      success: false,
      error: "OAuth flow failed",
    });
  });
});
