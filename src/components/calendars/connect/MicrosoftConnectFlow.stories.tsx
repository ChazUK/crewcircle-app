import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, Spinner } from "heroui-native";
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { MicrosoftConnectFlow } from "./MicrosoftConnectFlow";

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
        <Text className="text-base font-semibold text-foreground">Microsoft Calendar</Text>
      </View>
      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl font-bold text-foreground">M</Text>
        </View>
      </View>
      <View className="gap-3">
        <Button onPress={onBack} className="w-full" accessibilityLabel="Connect Microsoft Calendar">
          Connect Microsoft Calendar
        </Button>
        <Text className="px-1 text-center text-xs text-muted-foreground">
          We'll ask Microsoft to grant access to your calendars. Only busy events will be synced.
        </Text>
      </View>
    </View>
  );
}

function AuthorizingState({ onBack }: { onBack: () => void }) {
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
        <Text className="text-base font-semibold text-foreground">Microsoft Calendar</Text>
      </View>
      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl font-bold text-foreground">M</Text>
        </View>
      </View>
      <View className="rounded-lg bg-danger/10 px-3 py-2">
        <Text className="text-sm text-danger">{error}</Text>
      </View>
      <View className="gap-3">
        <Button onPress={onBack} className="w-full" accessibilityLabel="Connect Microsoft Calendar">
          Connect Microsoft Calendar
        </Button>
        <Text className="px-1 text-center text-xs text-muted-foreground">
          We'll ask Microsoft to grant access to your calendars. Only busy events will be synced.
        </Text>
      </View>
    </View>
  );
}

function NotConfiguredState({ onBack }: { onBack: () => void }) {
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
  title: "Calendars/MicrosoftConnectFlow",
  component: MicrosoftConnectFlow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    onBack: () => {},
  },
} satisfies Meta<typeof MicrosoftConnectFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <IdleState onBack={args.onBack} />,
};

export const Idle: Story = {
  render: (args) => <IdleState onBack={args.onBack} />,
};

export const Authorizing: Story = {
  render: (args) => <AuthorizingState onBack={args.onBack} />,
};

export const NotConfigured: Story = {
  render: (args) => <NotConfiguredState onBack={args.onBack} />,
};

export const CancelledError: Story = {
  render: (args) => <ErrorState onBack={args.onBack} error="User cancelled" />,
};

export const AuthError: Story = {
  render: (args) => <ErrorState onBack={args.onBack} error="OAuth flow failed" />,
};

export const ConnectionError: Story = {
  render: (args) => (
    <ErrorState onBack={args.onBack} error="Failed to connect calendar. Please try again." />
  ),
};
