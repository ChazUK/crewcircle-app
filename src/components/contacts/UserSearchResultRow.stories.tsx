import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { UserSearchResultRow } from "./UserSearchResultRow";

const decorator = (Story: React.ComponentType) => (
  <View className="p-4">
    <Story />
  </View>
);

const meta = {
  title: "Contacts/UserSearchResultRow",
  component: UserSearchResultRow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    user: { firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
    state: "none",
    onInvite: () => {},
  },
} satisfies Meta<typeof UserSearchResultRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotConnected: Story = {};

export const Pending: Story = {
  args: { state: "pending" },
};

export const AlreadyContact: Story = {
  args: { state: "contact" },
};

export const Busy: Story = {
  args: { isBusy: true },
};
