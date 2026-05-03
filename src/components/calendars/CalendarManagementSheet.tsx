import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useAction, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { BottomSheet, Button, Dialog, PressableFeedback, Separator, Spinner } from "heroui-native";
import { Fragment, useState } from "react";
import { Text, View } from "react-native";

import { fetchNativeEvents } from "@/lib/calendars/fetchNativeEvents";

export type ConnectionRow = {
  _id: Id<"calendarConnections">;
  provider: string;
  label: string;
  color: string;
  lastSyncedAt?: number;
  lastSyncError?: string;
  syncErrorCount: number;
  subCalendarCount: number;
  nativeCalendarIds?: string[];
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

type ConnectionListProps = {
  connections: ConnectionRow[] | undefined;
  syncingIds?: Set<string>;
  onSync: (connection: ConnectionRow) => void;
  onDisconnect: (id: Id<"calendarConnections">) => void;
};

// Exported for Storybook — renders all visual states without Convex
export function CalendarConnectionList({
  connections,
  syncingIds,
  onSync,
  onDisconnect,
}: ConnectionListProps) {
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
      {connections.map((connection, idx) => {
        const isSyncing = syncingIds?.has(connection._id) ?? false;
        return (
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
                  onPress={() => !isSyncing && onSync(connection)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sync ${connection.label}`}
                  className="flex-1"
                >
                  <View className="flex-row items-center gap-2">
                    {isSyncing && <Spinner size="sm" />}
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                        {connection.label}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {isSyncing
                          ? "Syncing…"
                          : connection.lastSyncedAt != null
                            ? `Last synced ${formatDistanceToNow(connection.lastSyncedAt)} ago`
                            : "Never synced"}
                      </Text>
                    </View>
                  </View>
                </PressableFeedback>

                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => onDisconnect(connection._id)}
                  accessibilityLabel={`Disconnect ${connection.label}`}
                  isDisabled={isSyncing}
                >
                  Disconnect
                </Button>
              </View>

              {connection.syncErrorCount > 3 && (
                <View className="mt-2 rounded-lg bg-danger/10 px-3 py-2">
                  <Text className="text-xs font-medium text-danger">Sync error</Text>
                  {connection.lastSyncError != null && (
                    <Text className="mt-0.5 text-xs text-danger/80">
                      {connection.lastSyncError}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

export function CalendarManagementSheet({ isOpen, onClose }: Props) {
  const connections = useQuery(api.calendars.queries.getConnections);
  const [pendingDisconnect, setPendingDisconnect] = useState<Id<"calendarConnections"> | null>(
    null,
  );
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const disconnectAction = useAction(api.calendars.actions.disconnect);
  const syncNowAction = useAction(api.calendars.actions.syncNow);
  const uploadNativeEventsAction = useAction(api.calendars.uploadNativeEvents);

  const handleSync = async (connection: ConnectionRow) => {
    setSyncingIds((prev) => new Set([...prev, connection._id]));
    try {
      if (connection.provider === "native") {
        const syncWindow = {
          windowStartMs: Date.now() - 30 * 24 * 60 * 60 * 1000,
          windowEndMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
        };
        const events = await fetchNativeEvents(connection.nativeCalendarIds ?? [], syncWindow);
        await uploadNativeEventsAction({ connectionId: connection._id, events });
      } else {
        await syncNowAction({ connectionId: connection._id });
      }
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(connection._id);
        return next;
      });
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!pendingDisconnect) return;
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      await disconnectAction({ connectionId: pendingDisconnect });
      setPendingDisconnect(null);
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleDisconnectCancel = () => {
    if (isDisconnecting) return;
    setPendingDisconnect(null);
    setDisconnectError(null);
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
        <BottomSheet.Portal disableFullWindowOverlay>
          <BottomSheet.Overlay />
          <BottomSheet.Content snapPoints={["55%", "85%"]}>
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <View className="mb-4 gap-1.5 px-1">
                <BottomSheet.Title>Connected Calendars</BottomSheet.Title>
              </View>
              <CalendarConnectionList
                connections={connections}
                syncingIds={syncingIds}
                onSync={handleSync}
                onDisconnect={(id) => {
                  setDisconnectError(null);
                  setPendingDisconnect(id);
                }}
              />
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <Dialog
        isOpen={pendingDisconnect != null}
        onOpenChange={(open) => !open && handleDisconnectCancel()}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-4 gap-1.5">
              <Dialog.Title>Disconnect calendar?</Dialog.Title>
              <Dialog.Description>
                This will delete all synced events for this calendar. This cannot be undone.
              </Dialog.Description>
            </View>

            {disconnectError != null && (
              <View className="mb-3 rounded-xl bg-danger/10 p-3">
                <Text className="text-sm text-danger">{disconnectError}</Text>
              </View>
            )}

            <View className="flex-row justify-end gap-3">
              <Button
                variant="tertiary"
                size="sm"
                onPress={handleDisconnectCancel}
                isDisabled={isDisconnecting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onPress={handleDisconnectConfirm}
                isDisabled={isDisconnecting}
              >
                {isDisconnecting ? <Spinner size="sm" /> : "Disconnect"}
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
