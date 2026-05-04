import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Button, Spinner } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { useSubCalendarConfirm } from "@/hooks/calendars/useSubCalendarConfirm";
import { pkceConnect } from "@/lib/auth/pkceConnect";

import { SubCalendarPicker } from "../SubCalendarPicker";

WebBrowser.maybeCompleteAuthSession();

type Step = "idle" | "authorizing" | "picking-subcalendars";

type Props = {
  onBack: () => void;
};

export function MicrosoftConnectFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<Id<"calendarConnections"> | null>(null);
  const [connectionColor, setConnectionColor] = useState<string>("#0078d4");

  const connectMicrosoft = useAction(api.calendars.actions.connectMicrosoft);
  const confirm = useSubCalendarConfirm(connectionId);

  const clientId = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? "";

  const handleConnect = async () => {
    setStep("authorizing");
    setError(null);

    const redirectUri = AuthSession.makeRedirectUri({ scheme: "crewcircle" });

    const pkceResult = await pkceConnect({
      authEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId,
      scopes: ["Calendars.Read", "User.Read", "offline_access"],
      redirectUri,
    });

    if (!pkceResult.success) {
      setError(pkceResult.error);
      setStep("idle");
      return;
    }

    try {
      const result = await connectMicrosoft({
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
    try {
      await confirm(selected);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendar selection");
      setStep("idle");
    }
  };

  if (step === "picking-subcalendars" && connectionId !== null) {
    return (
      <SubCalendarPicker
        connectionId={connectionId}
        provider="microsoft"
        connectionColor={connectionColor}
        onConfirm={handleConfirm}
        onBack={onBack}
      />
    );
  }

  if (!clientId) {
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
          <Text className="text-base font-semibold text-foreground">Microsoft Calendar</Text>
        </View>
        <View className="rounded-lg bg-danger/10 px-3 py-2">
          <Text className="text-sm text-danger">
            Microsoft Calendar is not yet configured. Please contact support.
          </Text>
        </View>
      </View>
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
        <Text className="text-base font-semibold text-foreground">Microsoft Calendar</Text>
      </View>

      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl font-bold text-foreground">M</Text>
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
            accessibilityLabel="Connect Microsoft Calendar"
          >
            Connect Microsoft Calendar
          </Button>
          <Text className="px-1 text-center text-xs text-muted-foreground">
            We'll ask Microsoft to grant access to your calendars. Only busy events will be synced.
          </Text>
        </View>
      )}
    </View>
  );
}
