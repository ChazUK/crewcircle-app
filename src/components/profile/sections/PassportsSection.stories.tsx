import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { PassportsSection } from "./PassportsSection";

const meta = {
  title: "Profile/PassportsSection",
  component: PassportsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof PassportsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    passports: ["GB", "IE", "US"],
  },
};

export const Empty: Story = {
  args: {},
};
