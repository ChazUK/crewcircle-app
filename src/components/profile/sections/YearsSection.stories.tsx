import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { YearsSection } from "./YearsSection";

const meta = {
  title: "Profile/YearsSection",
  component: YearsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof YearsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    startYearInDepartment: 2005,
    department: "Camera",
  },
};

export const Empty: Story = {
  args: {},
};
