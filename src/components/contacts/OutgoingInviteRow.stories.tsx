import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { OutgoingInviteRow } from "./OutgoingInviteRow";

const decorator = (Story: React.ComponentType) => (
  <View className="p-4">
    <Story />
  </View>
);

const meta = {
  title: "Contacts/OutgoingInviteRow",
  component: OutgoingInviteRow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    targetLabel: "Alice Smith",
    targetSubtitle: "Pending invite",
    onCancel: () => {},
  },
} satisfies Meta<typeof OutgoingInviteRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExternalEmail: Story = {
  args: {
    targetLabel: "stranger@example.com",
    targetSubtitle: "Awaiting signup",
  },
};
