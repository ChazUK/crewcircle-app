import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { GearIcon } from "./GearIcon";

const meta = {
  title: "UI/Icons/GearIcon",
  component: GearIcon,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f9f9",
        }}
      >
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "range", min: 12, max: 96, step: 2 } },
    color: { control: { type: "color" } },
  },
  args: {
    size: 24,
    color: "#1f2937",
  },
} satisfies Meta<typeof GearIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 16 },
};

export const Large: Story = {
  args: { size: 64 },
};

export const Accent: Story = {
  args: { size: 48, color: "#6366f1" },
};

export const OnDark: Story = {
  args: { size: 32, color: "#f9fafb" },
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d1117",
        }}
      >
        <Story />
      </View>
    ),
  ],
};
