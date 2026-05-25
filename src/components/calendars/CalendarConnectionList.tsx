import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Accordion, Button, PressableFeedback, Separator, Spinner, Switch } from "heroui-native";
import { XIcon } from "lucide-react-native";
import { Text, View } from "react-native";
import { Fragment } from "react/jsx-runtime";

import { EmptyState } from "../ui/EmptyState";
import { CalendarProviderIcon } from "../ui/icons/CalendarProviderIcons";

const SHOW_SWITCH = false;
const BUSY_SWITCH = false;
const DISCONNECT = true;

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
  deviceId?: string;
  devicePlatform?: "ios" | "android";
};

type Props = {
  connections: ConnectionRow[] | undefined;
  syncingIds?: Set<string>;
  onSync: (connection: ConnectionRow) => void;
  onDisconnect: (id: Id<"calendarConnections">) => void;
  // Stable identifier for the device rendering the list. Used to mark
  // native connections that originated on another device — those rows
  // are read-only here because their calendar ids can't be queried on
  // this device.
  currentDeviceId?: string;
};

function isForeignDeviceConnection(
  row: ConnectionRow,
  currentDeviceId: string | undefined,
): boolean {
  if (row.provider !== "native") return false;
  if (row.deviceId == null) return false;
  if (currentDeviceId == null) return false;
  return row.deviceId !== currentDeviceId;
}

function platformLabel(platform: "ios" | "android" | undefined): string {
  if (platform === "ios") return "iPhone";
  if (platform === "android") return "Android";
  return "another device";
}

export function CalendarConnectionList({
  connections,
  syncingIds,
  onSync,
  onDisconnect,
  currentDeviceId,
}: Props) {
  if (connections === undefined) {
    return (
      <View className="items-center py-8">
        <Spinner />
      </View>
    );
  }

  if (connections.length === 0) {
    return <EmptyState>No calendars connected yet.</EmptyState>;
  }

  const numConnections = connections.length;
  const numSubCalendars = connections
    .map((connection) => connection.subCalendarCount)
    .reduce((a, b) => a + b, 0);
  // const numMarking = connections.filter((c) => c.subCalendarCount > 0).length;
  const stats = [
    `${numConnections} connections`,
    `${numSubCalendars} sub calendars`,
    // `${numMarking} marking you busy`,
  ];

  return (
    <Accordion
      selectionMode="single"
      variant="surface"
      classNames={{
        container: "bg-secondary",
      }}
    >
      <Accordion.Item value="1">
        <Accordion.Trigger>
          <View className="flex-1">
            <Text className="text-base font-semibold">Calendars</Text>
            <Text className="text-xs text-muted">{stats.join(" · ")}</Text>
          </View>
          <Accordion.Indicator />
        </Accordion.Trigger>
        <Accordion.Content>
          {connections.length > 0 ? (
            <Fragment>
              <View className="mb-2 flex-row items-center gap-3">
                <Text className="flex-1 text-xs uppercase">Source</Text>
                {SHOW_SWITCH && <Text className="w-12 text-center text-xs uppercase">Show</Text>}
                {BUSY_SWITCH && <Text className="w-12 text-center text-xs uppercase">Busy</Text>}
              </View>
              <View className="gap-3">
                {connections.map((connection, index) => {
                  const isForeign = isForeignDeviceConnection(connection, currentDeviceId);
                  return (
                    <Fragment key={connection._id}>
                      {index !== 0 && <Separator />}
                      <CalendarConnectionItem
                        provider={connection.provider}
                        color={connection.color}
                        label={connection.label}
                        lastSyncedAt={connection.lastSyncedAt}
                        isSyncing={syncingIds?.has(connection._id) ?? false}
                        syncErrorCount={connection.syncErrorCount}
                        lastSyncError={connection.lastSyncError}
                        isForeignDevice={isForeign}
                        foreignDeviceLabel={
                          isForeign ? platformLabel(connection.devicePlatform) : undefined
                        }
                        onSync={() => onSync(connection)}
                        onDisconnect={() => onDisconnect(connection._id)}
                      />
                    </Fragment>
                  );
                })}
              </View>
            </Fragment>
          ) : null}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

type CalendarConnectionItemProps = {
  provider: string;
  color: string;
  label: string;
  lastSyncedAt?: number;
  isSyncing?: boolean;
  syncErrorCount?: number;
  lastSyncError?: string;
  isForeignDevice?: boolean;
  foreignDeviceLabel?: string;
  onSync: () => void;
  onDisconnect: () => void;
};

function CalendarConnectionItem({
  provider,
  color,
  label,
  lastSyncedAt,
  isSyncing,
  syncErrorCount = 0,
  lastSyncError,
  isForeignDevice,
  foreignDeviceLabel,
  onSync,
  onDisconnect,
}: CalendarConnectionItemProps) {
  const syncStatus = isForeignDevice
    ? `Connected on ${foreignDeviceLabel ?? "another device"} — open the app there to sync`
    : isSyncing
      ? "Syncing..."
      : lastSyncedAt
        ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
        : "Never synced";

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-3">
        <PressableFeedback
          className="flex-1 flex-row items-center gap-3"
          accessibilityRole="button"
          isDisabled={isForeignDevice}
          onPress={isForeignDevice ? undefined : onSync}
        >
          <View className="size-7 items-center justify-center">
            {isSyncing ? (
              <Spinner size="sm" />
            ) : (
              <Fragment>
                <CalendarProviderIcon provider={provider} size={28} />
                <View
                  className="absolute -right-1 -bottom-1 size-2 rounded-full"
                  style={{ backgroundColor: color }}
                ></View>
              </Fragment>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
              {label}
            </Text>
            <Text className="text-xs text-muted" numberOfLines={1}>
              {syncStatus}
            </Text>
          </View>
        </PressableFeedback>
        {SHOW_SWITCH && <Switch isSelected />}
        {BUSY_SWITCH && <Switch isSelected />}
        {DISCONNECT && (
          <Button
            variant="danger-soft"
            size="sm"
            isIconOnly
            isDisabled={isForeignDevice}
            onPress={onDisconnect}
          >
            <XIcon size={16} />
          </Button>
        )}
      </View>
      {syncErrorCount > 3 && (
        <View className="mt-2 rounded-lg bg-danger/10 px-3 py-2">
          <Text className="text-xs font-medium text-danger">Sync error</Text>
          {lastSyncError != null && (
            <Text className="mt-0.5 text-xs text-danger/80">{lastSyncError}</Text>
          )}
        </View>
      )}
    </View>
  );
}
