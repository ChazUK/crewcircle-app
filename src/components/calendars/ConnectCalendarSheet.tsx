import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet, PressableFeedback, Surface } from "heroui-native";
import { ChevronRightIcon } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarProviderIcon } from "../ui/icons/CalendarProviderIcons";
import { type ActiveStep, renderConnectFlow } from "./renderConnectFlow";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ConnectCalendarSheet({ isOpen, onClose }: Props) {
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const insets = useSafeAreaInsets();

  const handleSheetOpenChange = (open: boolean) => {
    if (open) return;
    if (activeStep !== null) {
      // During a connect flow, closing gesture navigates back rather than dismissing the sheet
      setActiveStep(null);
    } else {
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={handleSheetOpenChange}>
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay />
        <BottomSheet.Content enablePanDownToClose={activeStep === null}>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom }}>
            {activeStep !== null ? (
              renderConnectFlow(activeStep, () => setActiveStep(null))
            ) : (
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

                <View className="gap-2">
                  <CalendarButton provider="google" onPress={() => setActiveStep("google")}>
                    Google Calendar
                  </CalendarButton>
                  <CalendarButton provider="microsoft" onPress={() => setActiveStep("microsoft")}>
                    Microsoft Calendar
                  </CalendarButton>
                  <CalendarButton provider="native" onPress={() => setActiveStep("native")}>
                    Device Calendar
                  </CalendarButton>
                  <CalendarButton provider="ical" onPress={() => setActiveStep("ical")}>
                    iCal or Webcal
                  </CalendarButton>
                </View>
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

type CalendarButtonProps = {
  children: string;
  provider: "google" | "microsoft" | "ical" | "native";
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
