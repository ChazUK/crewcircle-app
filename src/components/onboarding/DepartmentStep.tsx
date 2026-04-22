import { Button, cn } from "heroui-native";
import { View } from "react-native";

import { StepLayout } from "./StepLayout";

const DEPARTMENTS = [
  "Camera",
  "Lighting",
  "Grip",
  "Sound",
  "Art Department",
  "Costume",
  "Hair & Makeup",
  "Production",
  "Locations",
  "Transport",
  "VFX",
  "Editing",
  "Script",
  "Stunts",
];

type Props = {
  value: string[];
  onChange: (departments: string[]) => void;
};

export function DepartmentStep({ value, onChange }: Props) {
  function toggle(dept: string) {
    if (value.includes(dept)) {
      onChange(value.filter((d) => d !== dept));
    } else {
      onChange([...value, dept]);
    }
  }

  return (
    <StepLayout
      title="Your department"
      subtitle="Select the departments you work in. You can update this later."
    >
      <View className="mx-4 flex-row flex-wrap gap-2">
        {DEPARTMENTS.map((dept) => {
          const isSelected = value.includes(dept);
          return (
            <Button
              key={dept}
              variant={isSelected ? "primary" : "outline"}
              size="sm"
              className={cn("rounded-full", !isSelected && "border-border")}
              onPress={() => toggle(dept)}
            >
              {dept}
            </Button>
          );
        })}
      </View>
    </StepLayout>
  );
}
