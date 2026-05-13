import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { RemoveContactDialog } from "./RemoveContactDialog";

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

type Args = React.ComponentProps<typeof RemoveContactDialog>;

function Harness(args: Args) {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  useEffect(() => setIsOpen(args.isOpen), [args.isOpen]);
  const close = () => setIsOpen(false);
  return <RemoveContactDialog {...args} isOpen={isOpen} onConfirm={close} onCancel={close} />;
}

const meta = {
  title: "Contacts/RemoveContactDialog",
  component: RemoveContactDialog,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    isOpen: true,
    contactName: "Alice Smith",
    isRemoving: false,
    error: null,
    onConfirm: () => {},
    onCancel: () => {},
  },
  render: (args) => <Harness {...args} />,
} satisfies Meta<typeof RemoveContactDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Removing: Story = { args: { isRemoving: true } };
export const WithError: Story = { args: { error: "Could not remove contact." } };
