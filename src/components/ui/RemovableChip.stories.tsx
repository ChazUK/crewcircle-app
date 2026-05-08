import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { RemovableChip } from "./RemovableChip";

const meta = {
  title: "UI/RemovableChip",
  component: RemovableChip,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    onRemove: () => {},
  },
} satisfies Meta<typeof RemovableChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Drone operator" },
};

export const LongLabel: Story = {
  args: { label: "Underwater camera operator" },
};
