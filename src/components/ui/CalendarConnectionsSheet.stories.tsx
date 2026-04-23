import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CalendarConnectionsSheet } from "./CalendarConnectionsSheet";

type StoryArgs = {
  startOpen: boolean;
};

function Harness({ startOpen }: StoryArgs) {
  const [isOpen, setIsOpen] = useState(startOpen);
  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Button onPress={() => setIsOpen(true)}>Open calendar connections</Button>
      <CalendarConnectionsSheet isOpen={isOpen} onOpenChange={setIsOpen} />
    </View>
  );
}

const meta = {
  title: "UI/CalendarConnectionsSheet",
  component: Harness,
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
            <Story />
          </View>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    ),
  ],
  tags: ["autodocs"],
  args: { startOpen: false },
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const InitiallyOpen: Story = {
  args: { startOpen: true },
};
