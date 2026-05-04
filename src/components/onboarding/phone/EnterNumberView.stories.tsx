import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, Spinner } from "heroui-native";
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PhoneNumberInput } from "@/components/ui/phone/PhoneNumberInput";

import { EnterNumberView } from "./EnterNumberView";

// Pure display helpers for each visual state — avoid importing live Clerk hooks

const DISCLOSURE =
  "We use your phone number to help fellow crew find you and to send job alerts and time-sensitive updates. It is never shown on your profile.";

function EmptyState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput value={{ country: "GB", national: "" }} onChange={() => {}} />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button
        variant="primary"
        isDisabled
        onPress={() => {}}
        accessibilityLabel="Send verification code"
      >
        Send code
      </Button>
    </View>
  );
}

function WithValidNumberState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput value={{ country: "GB", national: "07700900123" }} onChange={() => {}} />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button variant="primary" onPress={() => {}} accessibilityLabel="Send verification code">
        Send code
      </Button>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput
          value={{ country: "GB", national: "07700900123" }}
          onChange={() => {}}
          disabled
        />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button
        variant="primary"
        isDisabled
        onPress={() => {}}
        accessibilityLabel="Send verification code"
      >
        <Spinner />
      </Button>
    </View>
  );
}

function WithErrorState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput
          value={{ country: "GB", national: "07700900123" }}
          onChange={() => {}}
          error="This number is already associated with another account."
        />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button variant="primary" onPress={() => {}} accessibilityLabel="Send verification code">
        Send code
      </Button>
    </View>
  );
}

function UnitedStatesState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput value={{ country: "US", national: "2025551234" }} onChange={() => {}} />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button variant="primary" onPress={() => {}} accessibilityLabel="Send verification code">
        Send code
      </Button>
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
  title: "Onboarding/Phone/EnterNumberView",
  component: EnterNumberView,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    onCodeSent: () => {},
  },
} satisfies Meta<typeof EnterNumberView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <EmptyState />,
};

export const Empty: Story = {
  render: () => <EmptyState />,
};

export const WithValidNumber: Story = {
  render: () => <WithValidNumberState />,
};

export const Loading: Story = {
  render: () => <LoadingState />,
};

export const WithError: Story = {
  render: () => <WithErrorState />,
};

export const UnitedStates: Story = {
  render: () => <UnitedStatesState />,
};
