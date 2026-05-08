import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { SubCalendar } from "@shared/calendars";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, Dialog, Spinner } from "heroui-native";
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SubCalendarList } from "../SubCalendarPicker";
import { NativeConnectFlow } from "./NativeConnectFlow";

// Pure display helpers for each visual state - avoid importing live Convex hooks

function IdleState({ onBack }: { onBack: () => void }) {
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
        <Text className="text-base font-semibold text-foreground">Device Calendar</Text>
      </View>
      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📱</Text>
        </View>
      </View>
      <View className="gap-3">
        <Button onPress={onBack} className="w-full" accessibilityLabel="Connect Device Calendar">
          Connect Device Calendar
        </Button>
        <Text className="px-1 text-center text-xs text-muted-foreground">
          We'll ask for permission to read your device calendar.
        </Text>
      </View>
    </View>
  );
}

function RequestingPermissionState({ onBack }: { onBack: () => void }) {
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
        <Text className="text-base font-semibold text-foreground">Device Calendar</Text>
      </View>
      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📱</Text>
        </View>
      </View>
      <View className="items-center py-4">
        <Spinner />
      </View>
    </View>
  );
}

function ErrorState({ onBack, error }: { onBack: () => void; error: string }) {
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
        <Text className="text-base font-semibold text-foreground">Device Calendar</Text>
      </View>
      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📱</Text>
        </View>
      </View>
      <View className="rounded-lg bg-danger/10 px-3 py-2">
        <Text className="text-sm text-danger">{error}</Text>
      </View>
      <View className="gap-3">
        <Button onPress={onBack} className="w-full" accessibilityLabel="Connect Device Calendar">
          Connect Device Calendar
        </Button>
        <Text className="px-1 text-center text-xs text-muted-foreground">
          We'll ask for permission to read your device calendar.
        </Text>
      </View>
    </View>
  );
}

function PermissionDeniedState({
  instructions,
  onDismiss,
}: {
  instructions: string;
  onDismiss: () => void;
}) {
  return (
    <View className="flex-1 gap-6 py-4">
      <Dialog isOpen onOpenChange={(open) => !open && onDismiss()}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-4 gap-1.5">
              <Dialog.Title>Calendar access required</Dialog.Title>
              <Dialog.Description>{instructions}</Dialog.Description>
            </View>
            <View className="flex-row justify-end">
              <Button size="sm" onPress={onDismiss} accessibilityLabel="OK">
                OK
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}

const mockDeviceCalendars: SubCalendar[] = [
  { id: "cal_default", label: "Calendar", primary: false },
  { id: "cal_work", label: "Work", primary: false },
  { id: "cal_family", label: "Family", primary: false },
];

function PickingSubCalendarsState({ onBack }: { onBack: () => void }) {
  return (
    <SubCalendarList
      subCalendars={mockDeviceCalendars}
      provider="native"
      connectionColor="#6366f1"
      onConfirm={() => {}}
      onBack={onBack}
    />
  );
}

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

const meta = {
  title: "Calendars/NativeConnectFlow",
  component: NativeConnectFlow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    onBack: () => {},
  },
} satisfies Meta<typeof NativeConnectFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <IdleState onBack={args.onBack} />,
};

export const Idle: Story = {
  render: (args) => <IdleState onBack={args.onBack} />,
};

export const RequestingPermission: Story = {
  render: (args) => <RequestingPermissionState onBack={args.onBack} />,
};

export const PermissionDeniedIOS: Story = {
  render: (args) => (
    <PermissionDeniedState
      instructions="Go to Settings → Privacy & Security → Calendars and allow access for CrewCircle."
      onDismiss={args.onBack}
    />
  ),
};

export const PermissionDeniedAndroid: Story = {
  render: (args) => (
    <PermissionDeniedState
      instructions="Go to Settings → Apps → CrewCircle → Permissions and allow Calendar access."
      onDismiss={args.onBack}
    />
  ),
};

export const ConnectionError: Story = {
  render: (args) => (
    <ErrorState onBack={args.onBack} error="Connection failed. Please try again." />
  ),
};

export const PickingSubCalendars: Story = {
  render: (args) => <PickingSubCalendarsState onBack={args.onBack} />,
};
