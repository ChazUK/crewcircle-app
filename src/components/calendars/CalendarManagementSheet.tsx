import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { BottomSheet, Button, PressableFeedback, Separator, Spinner } from "heroui-native";
import { Fragment } from "react";
import { Text, View } from "react-native";

export type ConnectionRow = {
  _id: Id<"calendarConnections">;
  provider: string;
  label: string;
  color: string;
  lastSyncedAt?: number;
  lastSyncError?: string;
  syncErrorCount: number;
  subCalendarCount: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const PROVIDER_LOGO: Record<string, string> = {
  google: "G",
  microsoft: "M",
  ical: "📅",
  native: "📱",
};

// Exported for Storybook — renders all visual states without Convex
export function CalendarConnectionList({
  connections,
}: {
  connections: ConnectionRow[] | undefined;
}) {
  if (connections === undefined) {
    return (
      <View className="items-center py-8">
        <Spinner />
      </View>
    );
  }

  if (connections.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-sm text-muted-foreground">No calendars connected yet.</Text>
      </View>
    );
  }

  return (
    <View className="rounded-xl bg-default-100/40 px-3 py-2">
      {connections.map((connection, idx) => (
        <Fragment key={connection._id}>
          {idx > 0 && <Separator className="my-1" />}
          <View className="py-3">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-default-200">
                <Text className="text-sm font-semibold text-foreground">
                  {PROVIDER_LOGO[connection.provider] ?? "?"}
                </Text>
              </View>

              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: connection.color }}
              />

              <PressableFeedback
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel={`Manage ${connection.label}`}
                className="flex-1"
              >
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {connection.label}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {connection.lastSyncedAt != null
                    ? `Last synced ${formatDistanceToNow(connection.lastSyncedAt)} ago`
                    : "Never synced"}
                </Text>
              </PressableFeedback>

              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {}}
                accessibilityLabel={`Disconnect ${connection.label}`}
              >
                Disconnect
              </Button>
            </View>

            {connection.syncErrorCount > 3 && (
              <View className="mt-2 rounded-lg bg-danger/10 px-3 py-2">
                <Text className="text-xs font-medium text-danger">Sync error</Text>
                {connection.lastSyncError != null && (
                  <Text className="mt-0.5 text-xs text-danger/80">{connection.lastSyncError}</Text>
                )}
              </View>
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

export function CalendarManagementSheet({ isOpen, onClose }: Props) {
  const connections = useQuery(api.calendars.queries.getConnections);

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={["55%", "85%"]}>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View className="mb-4 gap-1.5 px-1">
              <BottomSheet.Title>Connected Calendars</BottomSheet.Title>
            </View>
            <CalendarConnectionList connections={connections} />
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
