import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { WorkEligibilitySection } from "./WorkEligibilitySection";

const meta = {
  title: "Profile/WorkEligibilitySection",
  component: WorkEligibilitySection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof WorkEligibilitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    workEligibility: ["USA", "Canada", "Australia"],
  },
};

export const Empty: Story = {
  args: {},
};
