import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollShadow, Select, useThemeColor } from "heroui-native";
import { useMemo, useState } from "react";

import { COUNTRIES } from "@/data/countries";

import { BottomSheetSearchField } from "./BottomSheetSearchField";

const COUNTRY_OPTIONS = COUNTRIES.map(({ code, name }) => ({
  value: code,
  label: `${name} (${code})`,
})) as SelectOption[];

type SelectOption = {
  value: string;
  label: string;
};

export const CountrySelect = ({
  onOpenChange,
  onValueChange,
}: {
  onOpenChange?: (isOpen: boolean) => void;
  onValueChange?: (value: SelectOption | undefined) => void;
}) => {
  const themeColorOverlay = useThemeColor("overlay");
  const [searchValue, setSearchValue] = useState("");
  const options = COUNTRY_OPTIONS;

  const filteredOptions = useMemo(() => {
    const q = searchValue.trim().toLocaleLowerCase();

    if (!q) return options;

    return options.filter((option: SelectOption) => option.label.toLowerCase().includes(q));
  }, [searchValue, options]);

  return (
    <Select onOpenChange={onOpenChange} onValueChange={onValueChange} presentation="bottom-sheet">
      <Select.Trigger>
        <Select.Value placeholder="Choose an option" />
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
          <BottomSheetSearchField
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search countries..."
          />

          <ScrollShadow LinearGradientComponent={LinearGradient} color={themeColorOverlay}>
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {filteredOptions.map((option) => (
                <Select.Item key={option.value} value={option.value} label={option.label} />
              ))}
            </BottomSheetScrollView>
          </ScrollShadow>
        </Select.Content>
      </Select.Portal>
    </Select>
  );
};
