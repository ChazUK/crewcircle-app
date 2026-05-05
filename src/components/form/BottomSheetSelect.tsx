import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollShadow, Select, useThemeColor } from "heroui-native";
import { ReactNode } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type BottomSheetSelectProps<T extends SelectOption> = {
  options: T[];
  value?: string;
  disabled?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  onChange?: (value: string) => void;
  renderTriggerValue?: (selected: T | undefined) => ReactNode;
  renderOptionContent?: (option: T) => ReactNode;
};

export const BottomSheetSelect = <T extends SelectOption>({
  options,
  value,
  disabled = false,
  placeholder = "Choose an option",
  accessibilityLabel,
  onChange,
  renderTriggerValue,
  renderOptionContent,
}: BottomSheetSelectProps<T>) => {
  const themeColorOverlay = useThemeColor("overlay");

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      value={selectedOption}
      onValueChange={(option) => {
        if (option) onChange?.(option.value);
      }}
      isDisabled={disabled}
      presentation="bottom-sheet"
      accessibilityLabel={accessibilityLabel}
    >
      <Select.Trigger>
        {renderTriggerValue ? (
          renderTriggerValue(selectedOption)
        ) : (
          <Select.Value placeholder={placeholder} />
        )}
        <Select.TriggerIndicator />
      </Select.Trigger>
      <Select.Portal>
        <Select.Overlay className="bg-black/50" />
        <Select.Content
          presentation="bottom-sheet"
          snapPoints={["50%", "90%"]}
          keyboardBehavior="extend"
          enableDynamicSizing={false}
          enableOverDrag={false}
          contentContainerClassName="flex-1 h-full"
        >
          <ScrollShadow LinearGradientComponent={LinearGradient} color={themeColorOverlay}>
            <BottomSheetScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} label={option.label}>
                  {renderOptionContent?.(option)}
                </Select.Item>
              ))}
            </BottomSheetScrollView>
          </ScrollShadow>
        </Select.Content>
      </Select.Portal>
    </Select>
  );
};
