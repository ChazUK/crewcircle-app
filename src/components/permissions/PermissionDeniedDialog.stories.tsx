import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { PermissionDeniedDialog } from "./PermissionDeniedDialog";

const decorator = (Story: React.ComponentType) => (
  <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
    <Story />
  </View>
);

const meta = {
  title: "Permissions/PermissionDeniedDialog",
  component: PermissionDeniedDialog,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Permission required",
    reason: "CrewCircle needs this permission to provide the feature.",
    steps: [
      {
        title: "Tap the feature",
        description: "Find the feature row in the CrewCircle list.",
      },
      {
        title: "Allow access",
        description: "Toggle the permission on so CrewCircle can use it.",
      },
    ],
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);
    return (
      <View style={{ gap: 12 }}>
        <Button onPress={() => setIsOpen(true)} accessibilityLabel="Open dialog">
          Open dialog
        </Button>
        <PermissionDeniedDialog {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </View>
    );
  },
} satisfies Meta<typeof PermissionDeniedDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = { args: { isOpen: true } };
