import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Platform } from "react-native";

import { pkceConnect } from "@/lib/auth/pkceConnect";

WebBrowser.maybeCompleteAuthSession();

export type GoogleConnectResult =
  | { ok: true; connectionId: Id<"calendarConnections">; color: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

export function useGoogleCalendarConnect() {
  const connectGoogle = useAction(api.calendars.actions.connectGoogle);

  return useCallback(async (): Promise<GoogleConnectResult> => {
    const clientId =
      Platform.OS === "ios"
        ? (process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID ??
          process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID ??
          "")
        : Platform.OS === "android"
          ? (process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID ??
            process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID ??
            "")
          : (process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID ?? "");

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME,
    });

    const pkceResult = await pkceConnect({
      authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      clientId,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly", "openid", "email"],
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
      const result = await connectGoogle({
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
  }, [connectGoogle]);
}
