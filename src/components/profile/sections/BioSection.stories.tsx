import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { BioSection } from "./BioSection";

const meta = {
  title: "Profile/BioSection",
  component: BioSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof BioSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    bio: "Camera operator with 15 years experience in film and television.",
  },
};

export const Empty: Story = {
  args: {
    bio: undefined,
  },
};
