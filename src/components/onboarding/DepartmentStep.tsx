import type { Department } from "@shared/departments/departments";

import { DepartmentRolesPicker } from "@/components/profile/DepartmentRolesPicker";

import { StepLayout } from "./StepLayout";

type Props = {
  department: Department | undefined;
  roles: string[];
  onDepartmentChange: (dept: Department) => void;
  onRolesChange: (roles: string[]) => void;
};

export function DepartmentStep({ department, roles, onDepartmentChange, onRolesChange }: Props) {
  return (
    <StepLayout
      title="Your department"
      subtitle="Select your department and roles. You can update this later."
    >
      <DepartmentRolesPicker
        department={department}
        roles={roles}
        onDepartmentChange={onDepartmentChange}
        onRolesChange={onRolesChange}
      />
    </StepLayout>
  );
}
