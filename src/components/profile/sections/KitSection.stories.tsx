import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { KitSection } from "./KitSection";

const meta = {
  title: "Profile/KitSection",
  component: KitSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof KitSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    kit: [
      { id: "kit_1", name: "Arri Alexa Mini" },
      { id: "kit_2", name: "RED Komodo" },
      { id: "kit_3", name: "Sony FX6" },
    ],
  },
};

export const Empty: Story = {
  args: {},
};
