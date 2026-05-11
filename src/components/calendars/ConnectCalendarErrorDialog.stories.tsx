import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ConnectCalendarErrorDialog } from "./ConnectCalendarErrorDialog";

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

type Args = React.ComponentProps<typeof ConnectCalendarErrorDialog>;

function DialogStoryHarness(args: Args) {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  useEffect(() => setIsOpen(args.isOpen), [args.isOpen]);
  return <ConnectCalendarErrorDialog {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}

const meta = {
  title: "Calendars/ConnectCalendarErrorDialog",
  component: ConnectCalendarErrorDialog,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    isOpen: true,
    message: "We couldn't connect to Google Calendar. Please try again.",
    onClose: () => {},
  },
  render: (args) => <DialogStoryHarness {...args} />,
} satisfies Meta<typeof ConnectCalendarErrorDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FallbackMessage: Story = {
  args: {
    message: null,
  },
};

export const MicrosoftNotConfigured: Story = {
  args: {
    message: "Microsoft Calendar is not yet configured. Please contact support.",
  },
};
