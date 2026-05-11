import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ConnectCalendarSheet } from "./ConnectCalendarSheet";

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

function SheetStoryHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="gap-3">
      <Button onPress={() => setIsOpen(true)}>Open sheet</Button>
      <ConnectCalendarSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </View>
  );
}

const meta = {
  title: "Calendars/ConnectCalendarSheet",
  component: ConnectCalendarSheet,
  decorators: [decorator],
  tags: ["autodocs"],
  render: () => <SheetStoryHarness />,
} satisfies Meta<typeof ConnectCalendarSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
