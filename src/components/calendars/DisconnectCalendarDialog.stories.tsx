import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DisconnectCalendarDialog } from "./DisconnectCalendarDialog";

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

type Args = React.ComponentProps<typeof DisconnectCalendarDialog>;

function DialogStoryHarness(args: Args) {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  useEffect(() => setIsOpen(args.isOpen), [args.isOpen]);
  const close = () => setIsOpen(false);
  return <DisconnectCalendarDialog {...args} isOpen={isOpen} onConfirm={close} onCancel={close} />;
}

const meta = {
  title: "Calendars/DisconnectCalendarDialog",
  component: DisconnectCalendarDialog,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    isOpen: true,
    isDisconnecting: false,
    error: null,
    onConfirm: () => {},
    onCancel: () => {},
  },
  render: (args) => <DialogStoryHarness {...args} />,
} satisfies Meta<typeof DisconnectCalendarDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: "Failed to disconnect — please try again.",
  },
};

export const Disconnecting: Story = {
  args: {
    isDisconnecting: true,
  },
};
