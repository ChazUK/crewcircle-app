import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { ContactsPermissionDeniedDialog } from "./ContactsPermissionDeniedDialog";

const decorator = (Story: React.ComponentType) => (
  <View style={{ padding: 16 }}>
    <Story />
  </View>
);

const meta = {
  title: "Permissions/ContactsPermissionDeniedDialog",
  component: ContactsPermissionDeniedDialog,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    isOpen: true,
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);
    return (
      <View style={{ gap: 12 }}>
        <Button onPress={() => setIsOpen(true)} accessibilityLabel="Open dialog">
          Open dialog
        </Button>
        <ContactsPermissionDeniedDialog
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </View>
    );
  },
} satisfies Meta<typeof ContactsPermissionDeniedDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { isOpen: true } };
