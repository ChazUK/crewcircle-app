import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { IncomingInviteRow } from "./IncomingInviteRow";

const decorator = (Story: React.ComponentType) => (
  <View className="p-4">
    <Story />
  </View>
);

const meta = {
  title: "Contacts/IncomingInviteRow",
  component: IncomingInviteRow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    from: { firstName: "Bob", lastName: "Jones", email: "bob@example.com" },
    onAccept: () => {},
    onDecline: () => {},
  },
} satisfies Meta<typeof IncomingInviteRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMessage: Story = {
  args: {
    message: "Met you on set in Manchester last month — would love to keep in touch.",
  },
};

export const Busy: Story = {
  args: {
    isBusy: true,
  },
};
