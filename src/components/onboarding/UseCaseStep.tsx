import { Description, Label, Radio, RadioGroup, cn } from "heroui-native";
import { View } from "react-native";

import { StepLayout } from "./StepLayout";

export type UseCase = "crew" | "production-manager";

type Option = {
  value: UseCase;
  title: string;
  description: string;
};

const OPTIONS: Option[] = [
  {
    value: "crew",
    title: "I'm crew",
    description: "Find work, get hired, or arrange a replacement on a production.",
  },
  {
    value: "production-manager",
    title: "I'm a production manager",
    description: "Hire crew, manage rosters, and keep productions running smoothly.",
  },
];

type Props = {
  value: UseCase | null;
  onChange: (value: UseCase) => void;
};

export function UseCaseStep({ value, onChange }: Props) {
  return (
    <StepLayout
      title="How will you use CrewCircle?"
      subtitle="We'll tailor your setup for what you're here to do."
    >
      <RadioGroup
        value={value as string}
        onValueChange={(val) => onChange(val as UseCase)}
        className="gap-4"
        variant="secondary"
      >
        {OPTIONS.map((option) => (
          <UseCaseOptionItem
            key={option.value}
            value={option.value}
            label={option.title}
            description={option.description}
          />
        ))}
      </RadioGroup>
    </StepLayout>
  );
}

type UseCaseOptionItemProps = {
  value: string;
  label: string;
  description: string;
};

function UseCaseOptionItem({ value, label, description }: UseCaseOptionItemProps) {
  return (
    <RadioGroup.Item value={value}>
      {({ isSelected }) => (
        <View
          className={cn(
            "flex-row items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-transparent",
            isSelected && "bg-surface shadow-surface",
          )}
        >
          <Radio>
            <Radio.Indicator className={cn(!isSelected && "border border-muted/10")} />
          </Radio>
          <View className="flex-1">
            <Label>
              <Label.Text className="text-lg">{label}</Label.Text>
            </Label>
            <Description className="text-base">{description}</Description>
          </View>
        </View>
      )}
    </RadioGroup.Item>
  );
}
