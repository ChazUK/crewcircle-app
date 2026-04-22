import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { LogoMark } from "./LogoMark";

const meta = {
  title: "UI/LogoMark",
  component: LogoMark,
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
} satisfies Meta<typeof LogoMark>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnDark: Story = {
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
