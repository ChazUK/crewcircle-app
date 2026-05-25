import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { MembershipsSection } from "./MembershipsSection";

const meta = {
  title: "Profile/MembershipsSection",
  component: MembershipsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof MembershipsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    memberships: [
      { id: "m1", name: "BECTU", memberNumber: "123456" },
      { id: "m2", name: "ACO", memberNumber: undefined },
      // { id: "m3", name: "GBCT", memberNumber: "GB-789" },
    ],
  },
};

export const Empty: Story = {
  args: {},
};
