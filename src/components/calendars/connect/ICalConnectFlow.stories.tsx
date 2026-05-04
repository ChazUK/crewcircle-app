import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, FieldError, Input, Label, Spinner, TextField } from "heroui-native";
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ICalConnectFlow } from "./ICalConnectFlow";

// Pure display helpers for each visual state — avoid importing live Convex hooks

function FormState({ onBack, urlError }: { onBack: () => void; urlError?: string }) {
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
        <Text className="text-base font-semibold text-foreground">iCal / Webcal</Text>
      </View>
      <View className="items-center gap-3 py-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📅</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          Subscribe to a calendar via iCal or Webcal feed URL
        </Text>
      </View>
      <View className="gap-4">
        <TextField isInvalid={!!urlError}>
          <Label>Calendar URL</Label>
          <Input
            keyboardType="url"
            autoCorrect={false}
            autoCapitalize="none"
            value="https://example.com/calendar.ics"
          />
          <FieldError isInvalid={!!urlError}>{urlError}</FieldError>
        </TextField>
        <TextField>
          <Label>Label</Label>
          <Input placeholder="iCal Calendar" value="" />
        </TextField>
        <Button className="w-full" accessibilityLabel="Connect iCal calendar">
          Connect
        </Button>
      </View>
    </View>
  );
}

function EmptyFormState({ onBack, urlError }: { onBack: () => void; urlError?: string }) {
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
        <Text className="text-base font-semibold text-foreground">iCal / Webcal</Text>
      </View>
      <View className="items-center gap-3 py-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📅</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          Subscribe to a calendar via iCal or Webcal feed URL
        </Text>
      </View>
      <View className="gap-4">
        <TextField isInvalid={!!urlError}>
          <Label>Calendar URL</Label>
          <Input keyboardType="url" autoCorrect={false} autoCapitalize="none" value="" />
          <FieldError isInvalid={!!urlError}>{urlError}</FieldError>
        </TextField>
        <TextField>
          <Label>Label</Label>
          <Input placeholder="iCal Calendar" value="" />
        </TextField>
        <Button className="w-full" accessibilityLabel="Connect iCal calendar">
          Connect
        </Button>
      </View>
    </View>
  );
}

function SyncingState({ onBack }: { onBack: () => void }) {
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
        <Text className="text-base font-semibold text-foreground">iCal / Webcal</Text>
      </View>
      <View className="items-center gap-3 py-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📅</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          Subscribe to a calendar via iCal or Webcal feed URL
        </Text>
      </View>
      <View className="items-center py-4">
        <Spinner />
      </View>
    </View>
  );
}

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

const meta = {
  title: "Calendars/ICalConnectFlow",
  component: ICalConnectFlow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    onBack: () => {},
  },
} satisfies Meta<typeof ICalConnectFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <FormState onBack={args.onBack} />,
};

export const Idle: Story = {
  render: (args) => <EmptyFormState onBack={args.onBack} />,
};

export const WithUrl: Story = {
  render: (args) => <FormState onBack={args.onBack} />,
};

export const Syncing: Story = {
  render: (args) => <SyncingState onBack={args.onBack} />,
};

export const EmptyUrlError: Story = {
  render: (args) => <EmptyFormState onBack={args.onBack} urlError="Please enter a URL" />,
};

export const InvalidUrlError: Story = {
  render: (args) => (
    <FormState onBack={args.onBack} urlError="This URL doesn't appear to be a valid iCal feed." />
  ),
};

export const UnreachableUrlError: Story = {
  render: (args) => (
    <FormState
      onBack={args.onBack}
      urlError="We couldn't reach this URL. Please check it and try again."
    />
  ),
};
