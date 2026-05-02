import type { AuthSessionResult } from "expo-auth-session";

import type { PKCEConnectResult } from "./pkceConnect";

export function mapAuthResult(
  result: AuthSessionResult,
  codeVerifier: string | undefined,
): PKCEConnectResult {
  if (result.type === "success") {
    const authCode = result.params.code;
    if (!authCode || !codeVerifier) {
      return { success: false, error: "OAuth flow failed" };
    }
    return { success: true, authCode, codeVerifier };
  }
  if (result.type === "cancel") {
    return { success: false, error: "User cancelled" };
  }
  return { success: false, error: "OAuth flow failed" };
}
