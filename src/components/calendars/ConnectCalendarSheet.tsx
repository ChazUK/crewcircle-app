import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { CalendarProviderType, SubCalendar } from "@shared/calendars";
import { useAction } from "convex/react";
import { BottomSheet, PressableFeedback, Spinner, Surface } from "heroui-native";
import { ChevronRightIcon } from "lucide-react-native";
import { Fragment, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGoogleCalendarConnect } from "@/hooks/calendars/useGoogleCalendarConnect";
import { useMicrosoftCalendarConnect } from "@/hooks/calendars/useMicrosoftCalendarConnect";
import { useNativeCalendarConnect } from "@/hooks/calendars/useNativeCalendarConnect";
import { useSubCalendarConfirm } from "@/hooks/calendars/useSubCalendarConfirm";

import { CalendarPermissionDeniedDialog } from "../permissions/CalendarPermissionDeniedDialog";
import { CalendarProviderIcon } from "../ui/icons/CalendarProviderIcons";
import { ICalConnectForm } from "./connect/ICalConnectForm";
import { ConnectCalendarErrorDialog } from "./ConnectCalendarErrorDialog";
import { useCalendarSync } from "./hooks/useCalendarSync";
import { SubCalendarList, SubCalendarPicker } from "./SubCalendarPicker";

type Phase =
  | { kind: "buttons" }
  | { kind: "connecting"; provider: Exclude<CalendarProviderType, "ical"> }
  | {
      kind: "picking";
      provider: "google" | "microsoft";
      connectionId: Id<"calendarConnections">;
      color: string;
    }
  | {
      kind: "picking-native";
      connectionId: Id<"calendarConnections">;
      color: string;
      subCalendars: SubCalendar[];
    }
  | { kind: "ical-form" }
  | { kind: "ical-submitting" };

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ConnectCalendarSheet({ isOpen, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "buttons" });
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const connectionIdForPicker =
    phase.kind === "picking" || phase.kind === "picking-native" ? phase.connectionId : null;
  const confirmSubCalendars = useSubCalendarConfirm(connectionIdForPicker);

  const connectGoogle = useGoogleCalendarConnect();
  const connectMicrosoft = useMicrosoftCalendarConnect();
  const connectNative = useNativeCalendarConnect();
  const connectIcal = useAction(api.calendars.actions.connectIcal);
  const { syncNativeConnection } = useCalendarSync();

  const resetToButtons = () => {
    setPhase({ kind: "buttons" });
    setUrlError(null);
  };

  const closeAndReset = () => {
    setPhase({ kind: "buttons" });
    setUrlError(null);
    onClose();
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (open) return;
    if (phase.kind !== "buttons") {
      resetToButtons();
    } else {
      onClose();
    }
  };

  const handleGoogle = async () => {
    setPhase({ kind: "connecting", provider: "google" });
    const result = await connectGoogle();
    if (!result.ok) {
      if (!result.cancelled) setError(result.error);
      resetToButtons();
      return;
    }
    setPhase({
      kind: "picking",
      provider: "google",
      connectionId: result.connectionId,
      color: result.color,
    });
  };

  const handleMicrosoft = async () => {
    setPhase({ kind: "connecting", provider: "microsoft" });
    const result = await connectMicrosoft();
    if (!result.ok) {
      if (!result.cancelled) setError(result.error);
      resetToButtons();
      return;
    }
    setPhase({
      kind: "picking",
      provider: "microsoft",
      connectionId: result.connectionId,
      color: result.color,
    });
  };

  const handleNative = async () => {
    setPhase({ kind: "connecting", provider: "native" });
    const result = await connectNative();
    if (!result.ok) {
      if (result.permissionDenied) {
        setPermissionDenied(true);
      } else {
        setError(result.error);
      }
      resetToButtons();
      return;
    }
    setPhase({
      kind: "picking-native",
      connectionId: result.connectionId,
      color: result.color,
      subCalendars: result.subCalendars,
    });
  };

  const handleIcalSubmit = async ({ url, label }: { url: string; label: string }) => {
    setPhase({ kind: "ical-submitting" });
    setUrlError(null);
    try {
      await connectIcal({ url, label });
      closeAndReset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("ICAL_UNREACHABLE")) {
        setUrlError("We couldn't reach this URL. Please check it and try again.");
      } else {
        setUrlError("This URL doesn't appear to be a valid iCal feed.");
      }
      setPhase({ kind: "ical-form" });
    }
  };

  const handlePickerConfirm = async (
    selected: { externalId: string; label: string; color?: string }[],
  ) => {
    try {
      await confirmSubCalendars(selected);
      // Native sync runs from the device, not the server — kick it off
      // here so events appear immediately. Server-pulled providers
      // (google/microsoft/ical) are synced server-side from inside the
      // setEnabledSubCalendars action.
      if (phase.kind === "picking-native") {
        void syncNativeConnection(
          phase.connectionId,
          selected.map((s) => s.externalId),
        );
      }
      closeAndReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendar selection");
    }
  };

  const inFlow = phase.kind !== "buttons";

  return (
    <Fragment>
      <BottomSheet isOpen={isOpen} onOpenChange={handleSheetOpenChange}>
        <BottomSheet.Portal disableFullWindowOverlay>
          <BottomSheet.Overlay />
          <BottomSheet.Content enablePanDownToClose={!inFlow}>
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom }}>
              <View className="gap-2">
                <BottomSheet.Title className="flex-1">
                  <View>
                    <Text className="text-xs uppercase">Link a calendar</Text>
                    <Text className="text-lg font-medium text-foreground">
                      Keep your availability in one place
                    </Text>
                  </View>
                </BottomSheet.Title>
                <BottomSheet.Description className="text-sm">
                  We never share event information with your circles – only whether you're free or
                  busy.
                </BottomSheet.Description>

                {phase.kind === "buttons" && (
                  <View className="gap-2">
                    <CalendarButton provider="google" onPress={handleGoogle}>
                      Google Calendar
                    </CalendarButton>
                    <CalendarButton provider="microsoft" onPress={handleMicrosoft}>
                      Microsoft Calendar
                    </CalendarButton>
                    <CalendarButton provider="native" onPress={handleNative}>
                      Device Calendar
                    </CalendarButton>
                    <CalendarButton provider="ical" onPress={() => setPhase({ kind: "ical-form" })}>
                      iCal or Webcal
                    </CalendarButton>
                  </View>
                )}

                {phase.kind === "connecting" && (
                  <View className="items-center gap-3 py-8">
                    <Spinner />
                    <Text className="text-sm text-muted-foreground">
                      {connectingMessage(phase.provider)}
                    </Text>
                  </View>
                )}

                {phase.kind === "picking" && (
                  <View className="pt-2">
                    <SubCalendarPicker
                      connectionId={phase.connectionId}
                      provider={phase.provider}
                      connectionColor={phase.color}
                      onConfirm={handlePickerConfirm}
                      onBack={resetToButtons}
                    />
                  </View>
                )}

                {phase.kind === "picking-native" && (
                  <View className="pt-2">
                    <SubCalendarList
                      subCalendars={phase.subCalendars}
                      provider="native"
                      connectionColor={phase.color}
                      onConfirm={handlePickerConfirm}
                      onBack={resetToButtons}
                    />
                  </View>
                )}

                {phase.kind === "ical-form" && (
                  <View className="pt-2">
                    <ICalConnectForm
                      isSubmitting={false}
                      urlError={urlError}
                      onClearUrlError={() => setUrlError(null)}
                      onSubmit={handleIcalSubmit}
                      onCancel={resetToButtons}
                    />
                  </View>
                )}

                {phase.kind === "ical-submitting" && (
                  <View className="items-center gap-3 py-8">
                    <Spinner />
                    <Text className="text-sm text-muted-foreground">Connecting…</Text>
                  </View>
                )}
              </View>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <ConnectCalendarErrorDialog
        isOpen={error !== null}
        message={error}
        onClose={() => setError(null)}
      />

      <CalendarPermissionDeniedDialog
        isOpen={permissionDenied}
        onClose={() => setPermissionDenied(false)}
      />
    </Fragment>
  );
}

function connectingMessage(provider: Exclude<CalendarProviderType, "ical">) {
  switch (provider) {
    case "google":
      return "Connecting to Google Calendar…";
    case "microsoft":
      return "Connecting to Microsoft Calendar…";
    case "native":
      return "Requesting calendar access…";
  }
}

type CalendarButtonProps = {
  children: string;
  provider: CalendarProviderType;
  onPress: () => void;
};

function CalendarButton({ children, provider, onPress }: CalendarButtonProps) {
  return (
    <PressableFeedback onPress={onPress}>
      <Surface className="rounded-md">
        <View className="flex-1 flex-row gap-2 items-center">
          <View className="size-7 items-center justify-center">
            <CalendarProviderIcon provider={provider} size={28} />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
              {children}
            </Text>
          </View>
          <ChevronRightIcon size={16} />
        </View>
      </Surface>
    </PressableFeedback>
  );
}
