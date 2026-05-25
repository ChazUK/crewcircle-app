import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { DrivingLicencesSection } from "./DrivingLicencesSection";

const meta = {
  title: "Profile/DrivingLicencesSection",
  component: DrivingLicencesSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof DrivingLicencesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    drivingLicences: ["Car (B)", "Motorcycle (A)", "HGV/LGV (C)"],
  },
};

export const Empty: Story = { args: {} };
