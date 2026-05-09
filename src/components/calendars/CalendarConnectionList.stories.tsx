import type { Id } from "@convex/_generated/dataModel";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CalendarConnectionList, type ConnectionRow } from "./CalendarConnectionList";

const now = Date.now();

const mockConnections: ConnectionRow[] = [
  {
    _id: "conn_google_1" as Id<"calendarConnections">,
    provider: "google",
    label: "work@example.com",
    color: "#6366f1",
    lastSyncedAt: now - 5 * 60 * 1000,
    syncErrorCount: 0,
    subCalendarCount: 3,
  },
  {
    _id: "conn_ical_1" as Id<"calendarConnections">,
    provider: "ical",
    label: "Family Calendar",
    color: "#22c55e",
    lastSyncedAt: now - 2 * 60 * 60 * 1000,
    syncErrorCount: 0,
    subCalendarCount: 1,
  },
  {
    _id: "conn_native_1" as Id<"calendarConnections">,
    provider: "native",
    label: "Personal iPhone Calendar",
    color: "#f59e0b",
    lastSyncedAt: now - 30 * 60 * 1000,
    syncErrorCount: 0,
    subCalendarCount: 2,
    nativeCalendarIds: ["cal_default", "cal_birthdays"],
  },
];

const errorConnection: ConnectionRow = {
  _id: "conn_ms_1" as Id<"calendarConnections">,
  provider: "microsoft",
  label: "outlook@company.com",
  color: "#ef4444",
  lastSyncedAt: now - 24 * 60 * 60 * 1000,
  lastSyncError: "Authentication token expired. Please reconnect your account.",
  syncErrorCount: 5,
  subCalendarCount: 0,
};

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

const meta = {
  title: "Calendars/CalendarConnectionList",
  component: CalendarConnectionList,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    connections: mockConnections,
    syncingIds: new Set<string>(),
    onSync: () => {},
    onDisconnect: () => {},
  },
} satisfies Meta<typeof CalendarConnectionList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    connections: undefined,
  },
};

export const Empty: Story = {
  args: {
    connections: [],
  },
};

export const WithError: Story = {
  args: {
    connections: [errorConnection, ...mockConnections],
  },
};

export const SingleConnection: Story = {
  args: {
    connections: [mockConnections[0]!],
  },
};

export const NeverSynced: Story = {
  args: {
    connections: [
      {
        _id: "conn_new_1" as Id<"calendarConnections">,
        provider: "google",
        label: "new@example.com",
        color: "#8b5cf6",
        lastSyncedAt: undefined,
        syncErrorCount: 0,
        subCalendarCount: 0,
      },
    ],
  },
};

export const Syncing: Story = {
  args: {
    connections: mockConnections,
    syncingIds: new Set(["conn_ical_1"]),
  },
};

export const SyncingNative: Story = {
  args: {
    connections: mockConnections,
    syncingIds: new Set(["conn_native_1"]),
  },
};

export const SyncingMultiple: Story = {
  args: {
    connections: mockConnections,
    syncingIds: new Set(["conn_google_1", "conn_native_1"]),
  },
};
