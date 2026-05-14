import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { GhostSection } from "./GhostSection";

const meta = {
  title: "Profile/GhostSection",
  component: GhostSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { label: "Bio" },
} satisfies Meta<typeof GhostSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
