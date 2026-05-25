import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { LocationSection } from "./LocationSection";

const meta = {
  title: "Profile/LocationSection",
  component: LocationSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof LocationSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { city: "London", country: "GB" } };

export const CountryOnly: Story = { args: { country: "GB" } };

export const Empty: Story = {
  args: {},
};
