import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { View } from "react-native";

import { ContactRow } from "./ContactRow";

const decorator = (Story: React.ComponentType) => (
  <View style={{ flex: 1, padding: 16 }}>
    <Story />
  </View>
);

const meta = {
  title: "Contacts/ContactRow",
  component: ContactRow,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    user: {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
    },
  },
} satisfies Meta<typeof ContactRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSubtitle: Story = {
  args: {
    subtitle: "Director of Photography",
  },
};

export const WithTrailing: Story = {
  args: {
    trailing: (
      <Button variant="danger-soft" size="sm">
        Remove
      </Button>
    ),
  },
};

export const EmailOnly: Story = {
  args: {
    user: { email: "stranger@example.com" },
  },
};
