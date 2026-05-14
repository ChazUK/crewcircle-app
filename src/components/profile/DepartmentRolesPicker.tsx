import { DEPARTMENT_ROLES, DEPARTMENTS, type Department } from "@shared/departments/departments";
import { Card, Label, Select, TagGroup } from "heroui-native";
import { View } from "react-native";

type Props = {
  department: Department | undefined;
  roles: string[];
  onDepartmentChange: (dept: Department) => void;
  onRolesChange: (roles: string[]) => void;
};

export function DepartmentRolesPicker({
  department,
  roles,
  onDepartmentChange,
  onRolesChange,
}: Props) {
  const departmentOption = department ? { value: department, label: department } : undefined;

  function handleDepartmentChange(selected: { value?: string; label?: string }) {
    if (!selected.value) return;
    const dept = selected.value as Department;
    if (dept !== department) {
      onRolesChange([]);
    }
    onDepartmentChange(dept);
  }

  const availableRoles = department ? DEPARTMENT_ROLES[department] : [];
  const selectedKeys = new Set(roles);

  function handleRolesChange(keys: Set<string | number>) {
    onRolesChange(Array.from(keys).map(String));
  }

  return (
    <Card>
      <Card.Body className="gap-4">
        <View className="gap-2">
          <Label>Department</Label>
          <Select
            value={departmentOption}
            onValueChange={handleDepartmentChange}
            presentation="bottom-sheet"
          >
            <Select.Trigger>
              <Select.Value placeholder="Select a department" />
              <Select.TriggerIndicator />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay />
              <Select.Content presentation="bottom-sheet" snapPoints={["60%"]}>
                <Select.ListLabel>Department</Select.ListLabel>
                {DEPARTMENTS.map((dept) => (
                  <Select.Item key={dept} value={dept} label={dept} />
                ))}
              </Select.Content>
            </Select.Portal>
          </Select>
        </View>

        {department ? (
          <View className="gap-2">
            <Label>Roles</Label>
            <TagGroup
              selectionMode="multiple"
              selectedKeys={selectedKeys}
              onSelectionChange={handleRolesChange}
            >
              <TagGroup.List className="flex-row flex-wrap gap-2">
                {availableRoles.map((role) => (
                  <TagGroup.Item key={role} id={role}>
                    {role}
                  </TagGroup.Item>
                ))}
              </TagGroup.List>
            </TagGroup>
          </View>
        ) : null}
      </Card.Body>
    </Card>
  );
}
