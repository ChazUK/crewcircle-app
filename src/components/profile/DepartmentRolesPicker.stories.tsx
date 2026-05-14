import type { Department } from "@shared/departments/departments";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";

import { DepartmentRolesPicker } from "./DepartmentRolesPicker";

function Harness({
  initialDepartment,
  initialRoles,
}: {
  initialDepartment?: Department;
  initialRoles?: string[];
}) {
  const [department, setDepartment] = useState<Department | undefined>(initialDepartment);
  const [roles, setRoles] = useState<string[]>(initialRoles ?? []);

  return (
    <DepartmentRolesPicker
      department={department}
      roles={roles}
      onDepartmentChange={setDepartment}
      onRolesChange={setRoles}
    />
  );
}

const meta = {
  title: "Profile/DepartmentRolesPicker",
  component: Harness,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InitialState: Story = {
  args: {},
};

export const DepartmentSelected: Story = {
  args: { initialDepartment: "Camera" },
};

export const DepartmentAndRolesSelected: Story = {
  args: {
    initialDepartment: "Camera",
    initialRoles: ["Director of Photography", "1st AC"],
  },
};

export const SoundDepartment: Story = {
  args: {
    initialDepartment: "Sound",
    initialRoles: ["Production Sound Mixer"],
  },
};
