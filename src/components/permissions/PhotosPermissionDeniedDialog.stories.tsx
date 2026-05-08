import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { PhotosPermissionDeniedDialog } from "./PhotosPermissionDeniedDialog";

const decorator = (Story: React.ComponentType) => (
  <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
    <Story />
  </View>
);

const meta = {
  title: "Permissions/PhotosPermissionDeniedDialog",
  component: PhotosPermissionDeniedDialog,
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
        <PhotosPermissionDeniedDialog {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </View>
    );
  },
} satisfies Meta<typeof PhotosPermissionDeniedDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { isOpen: true } };
