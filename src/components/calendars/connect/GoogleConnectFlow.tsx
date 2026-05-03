import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Button, Spinner } from "heroui-native";
import { useState } from "react";
import { Platform, Text, View } from "react-native";

import { useSubCalendarConfirm } from "@/hooks/calendars/useSubCalendarConfirm";
import { pkceConnect } from "@/lib/auth/pkceConnect";

import { SubCalendarPicker } from "../SubCalendarPicker";

WebBrowser.maybeCompleteAuthSession();

type Step = "idle" | "authorizing" | "picking-subcalendars";

type Props = {
  onBack: () => void;
};

export function GoogleConnectFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<Id<"calendarConnections"> | null>(null);
  const [connectionColor, setConnectionColor] = useState<string>("#6366f1");

  const connectGoogle = useAction(api.calendars.actions.connectGoogle);
  const confirm = useSubCalendarConfirm(connectionId);

  const handleConnect = async () => {
    setStep("authorizing");
    setError(null);

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
      setError(pkceResult.error);
      setStep("idle");
      return;
    }

    try {
      const result = await connectGoogle({
        authCode: pkceResult.authCode,
        codeVerifier: pkceResult.codeVerifier,
        clientId,
        redirectUri,
        label: "",
      });
      setConnectionId(result.connectionId);
      setConnectionColor(result.color);
      setStep("picking-subcalendars");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStep("idle");
    }
  };

  const handleConfirm = async (selected: { externalId: string; label: string }[]) => {
    await confirm(selected);
    onBack();
  };

  if (step === "picking-subcalendars" && connectionId !== null) {
    return (
      <SubCalendarPicker
        connectionId={connectionId}
        provider="google"
        connectionColor={connectionColor}
        onConfirm={handleConfirm}
        onBack={onBack}
      />
    );
  }

  return (
    <View className="flex-1 gap-6 py-4">
      <View className="flex-row items-center gap-2 px-1">
        <Button
          variant="tertiary"
          size="sm"
          onPress={onBack}
          accessibilityLabel="Back to calendars"
        >
          ← Back
        </Button>
        <Text className="text-base font-semibold text-foreground">Google Calendar</Text>
      </View>

      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl font-bold text-foreground">G</Text>
        </View>
      </View>

      {error !== null && (
        <View className="rounded-lg bg-danger/10 px-3 py-2">
          <Text className="text-sm text-danger">{error}</Text>
        </View>
      )}

      {step === "authorizing" ? (
        <View className="items-center py-4">
          <Spinner />
        </View>
      ) : (
        <View className="gap-3">
          <Button
            onPress={handleConnect}
            className="w-full"
            accessibilityLabel="Connect Google Calendar"
          >
            Connect Google Calendar
          </Button>
          <Text className="px-1 text-center text-xs text-muted-foreground">
            We'll ask Google to grant access to your calendars. Only busy events will be synced.
          </Text>
        </View>
      )}
    </View>
  );
}
