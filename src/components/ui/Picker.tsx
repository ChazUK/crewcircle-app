import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Select } from "heroui-native";
import React, { useState } from "react";
import { Text, View } from "react-native";

export type PickerOption = {
  value: string;
  label: string;
};

type Props = {
  value: string | null;
  onChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
  label?: string;
  listLabel?: string;
  snapPoints?: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function Picker({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  label,
  listLabel,
  snapPoints = ["50%"],
  searchable = false,
  searchPlaceholder = "Search...",
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = value !== null ? (options.find((o) => o.value === value) ?? null) : null;

  const visibleOptions =
    searchable && searchTerm.length > 0
      ? options.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

  const handleValueChange = (option: (PickerOption | undefined) | (PickerOption | undefined)[]) => {
    const opt = Array.isArray(option) ? option[0] : option;
    if (opt) onChange(opt.value);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setSearchTerm("");
  };

  return (
    <View>
      {label ? (
        <Text className="text-sm font-medium text-foreground mb-1.5" accessibilityRole="text">
          {label}
        </Text>
      ) : null}
      <Select
        value={selectedOption ?? undefined}
        onValueChange={handleValueChange}
        onOpenChange={handleOpenChange}
        presentation="bottom-sheet"
      >
        <Select.Trigger>
          <Select.Value placeholder={placeholder} />
          <Select.TriggerIndicator />
        </Select.Trigger>
        <Select.Portal>
          <Select.Overlay />
          <Select.Content presentation="bottom-sheet" snapPoints={snapPoints}>
            {listLabel ? <Select.ListLabel className="mb-2">{listLabel}</Select.ListLabel> : null}
            {searchable ? (
              <BottomSheetTextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder={searchPlaceholder}
                className="mx-4 mb-2 px-3 py-2 rounded-lg border border-default-200 text-foreground bg-default-100"
                clearButtonMode="while-editing"
                autoCorrect={false}
                autoCapitalize="none"
              />
            ) : null}
            <BottomSheetScrollView>
              {visibleOptions.map((option) => (
                <Select.Item key={option.value} value={option.value} label={option.label} />
              ))}
            </BottomSheetScrollView>
          </Select.Content>
        </Select.Portal>
      </Select>
    </View>
  );
}
