import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { EmptyState } from "./EmptyState";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { text: "Nothing here yet" },
};

export const LongText: Story = {
  args: {
    text: "You haven't added anything yet. Tap the button above to get started.",
  },
};
