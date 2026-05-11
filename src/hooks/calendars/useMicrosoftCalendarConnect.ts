import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

import { pkceConnect } from "@/lib/auth/pkceConnect";

WebBrowser.maybeCompleteAuthSession();

export type MicrosoftConnectResult =
  | { ok: true; connectionId: Id<"calendarConnections">; color: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

export function useMicrosoftCalendarConnect() {
  const connectMicrosoft = useAction(api.calendars.actions.connectMicrosoft);

  return useCallback(async (): Promise<MicrosoftConnectResult> => {
    const clientId = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? "";

    if (!clientId) {
      return {
        ok: false,
        cancelled: false,
        error: "Microsoft Calendar is not yet configured. Please contact support.",
      };
    }

    const redirectUri = AuthSession.makeRedirectUri({ scheme: "crewcircle" });

    const pkceResult = await pkceConnect({
      authEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId,
      scopes: ["Calendars.Read", "User.Read", "offline_access"],
      redirectUri,
    });

    if (!pkceResult.success) {
      const cancelled =
        pkceResult.error.toLowerCase().includes("cancel") ||
        pkceResult.error.toLowerCase().includes("dismiss");
      return cancelled
        ? { ok: false, cancelled: true }
        : { ok: false, cancelled: false, error: pkceResult.error };
    }

    try {
      const result = await connectMicrosoft({
        authCode: pkceResult.authCode,
        codeVerifier: pkceResult.codeVerifier,
        clientId,
        redirectUri,
        label: "",
      });
      return { ok: true, connectionId: result.connectionId, color: result.color };
    } catch (err) {
      return {
        ok: false,
        cancelled: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }, [connectMicrosoft]);
}
