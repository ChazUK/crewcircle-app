import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { DepartmentRolesSection } from "./DepartmentRolesSection";

const meta = {
  title: "Profile/DepartmentRolesSection",
  component: DepartmentRolesSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof DepartmentRolesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDepartment: Story = {
  args: {
    department: "Camera",
  },
};

export const WithRoles: Story = {
  args: {
    department: "Camera",
    roles: ["Director of Photography", "1st AC"],
  },
};

export const WithManyRoles: Story = {
  args: {
    department: "Camera",
    roles: ["Director of Photography", "1st AC", "2nd AC", "Gaffer", "Best Boy", "Key Grip"],
  },
};

export const Empty: Story = {
  args: {},
};
