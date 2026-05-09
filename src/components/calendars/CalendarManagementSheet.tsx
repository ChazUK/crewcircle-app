import { api } from "@convex/_generated/api";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { BottomSheet } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { type ActiveStep, CalendarAddSection } from "./CalendarAddSection";
import { CalendarConnectionList } from "./CalendarConnectionList";
import { DisconnectCalendarDialog } from "./DisconnectCalendarDialog";
import { useCalendarSync } from "./hooks/useCalendarSync";
import { useDisconnectCalendar } from "./hooks/useDisconnectCalendar";
import { renderConnectFlow } from "./renderConnectFlow";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CalendarManagementSheet({ isOpen, onClose }: Props) {
  const connections = useQuery(api.calendars.queries.getConnections);
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const { syncingIds, syncConnection } = useCalendarSync();
  const disconnect = useDisconnectCalendar();

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
    <>
      <BottomSheet isOpen={isOpen} onOpenChange={handleSheetOpenChange}>
        <BottomSheet.Portal disableFullWindowOverlay>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={["55%", "85%"]}
            enablePanDownToClose={activeStep === null}
          >
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              {activeStep !== null ? (
                renderConnectFlow(activeStep, () => setActiveStep(null))
              ) : (
                <>
                  <View className="mb-4 gap-1.5 px-1">
                    <BottomSheet.Title>
                      <Text className="text-sm uppercase">Link a calendar</Text>
                      Keep your availability in one place
                    </BottomSheet.Title>
                  </View>
                  <CalendarConnectionList
                    connections={connections}
                    syncingIds={syncingIds}
                    onSync={syncConnection}
                    onDisconnect={disconnect.requestDisconnect}
                  />
                  <CalendarAddSection onSelectProvider={setActiveStep} />
                </>
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <DisconnectCalendarDialog
        isOpen={disconnect.pendingId != null}
        isDisconnecting={disconnect.isDisconnecting}
        error={disconnect.error}
        onConfirm={disconnect.confirm}
        onCancel={disconnect.cancel}
      />
    </>
  );
}
