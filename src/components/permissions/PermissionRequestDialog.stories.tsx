import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { BellIcon, CalendarIcon, UsersIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { PermissionRequestDialog } from "./PermissionRequestDialog";

const decorator = (Story: React.ComponentType) => (
  <View style={{ padding: 16 }}>
    <Story />
  </View>
);

const meta = {
  title: "Permissions/PermissionRequestDialog",
  component: PermissionRequestDialog,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    isOpen: true,
    onClose: () => {},
    onContinue: () => {},
    title: "Allow calendar access?",
    reason: "CrewCircle uses your calendar to coordinate plans with your crew.",
    benefits: [
      {
        title: "See when you're free",
        description: "We'll only check your busy times – never read event details.",
        icon: CalendarIcon,
      },
      {
        title: "Add events automatically",
        description: "Crew plans land directly on your calendar.",
        icon: UsersIcon,
      },
      {
        title: "Stay in the loop",
        description: "Get a heads-up when plans change.",
        icon: BellIcon,
      },
    ],
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);
    return (
      <View style={{ gap: 12 }}>
        <Button onPress={() => setIsOpen(true)} accessibilityLabel="Open dialog">
          Open dialog
        </Button>
        <PermissionRequestDialog
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onContinue={() => setIsOpen(false)}
        />
      </View>
    );
  },
} satisfies Meta<typeof PermissionRequestDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { isOpen: true } };
