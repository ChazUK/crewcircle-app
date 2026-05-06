import {
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollShadow, Select, useThemeColor } from "heroui-native";
import { memo, ReactNode, useCallback, useMemo, useState } from "react";
import { ListRenderItem, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheetSearch } from "./BottomSheetSearch";

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
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: "default" | "unstyled";
  /**
   * Predicate used to filter options against the search query.
   *
   * `query` is already trimmed and lower-cased, and empty queries short-circuit
   * before this is called — your predicate never receives `""`.
   *
   * Defaults to a case-insensitive `label.includes(query)` match. Override to
   * search across other fields, e.g. a country dial code:
   *
   * ```ts
   * const filterCountry = useCallback(
   *   (c: Country, q: string) =>
   *     c.label.toLocaleLowerCase().includes(q) || c.dialCode.includes(q),
   *   [],
   * );
   *
   * <BottomSheetSelect options={countries} filterOption={filterCountry} />
   * ```
   */
  filterOption?: (option: T, query: string) => boolean;
  onChange?: (value: string) => void;
  renderTriggerValue?: (selected: T | undefined) => ReactNode;
  renderOptionContent?: (option: T) => ReactNode;
};

const defaultFilterOption = <T extends SelectOption>(option: T, query: string) =>
  option.label.toLocaleLowerCase().includes(query);

const FooterSearch = memo(function FooterSearch({
  onChange,
  placeholder,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <BottomSheetSearch
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      placeholder={placeholder}
    />
  );
});

export const BottomSheetSelect = <T extends SelectOption>({
  options,
  value,
  disabled = false,
  placeholder = "Choose an option",
  accessibilityLabel,
  searchable = false,
  searchPlaceholder = "Search...",
  variant = "default",
  filterOption = defaultFilterOption,
  onChange,
  renderTriggerValue,
  renderOptionContent,
}: BottomSheetSelectProps<T>) => {
  const themeColorOverlay = useThemeColor("overlay");
  const insets = useSafeAreaInsets();
  const [searchValue, setSearchValue] = useState("");

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable) return options;
    const q = searchValue.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((option) => filterOption(option, q));
  }, [searchable, searchValue, options, filterOption]);

  const renderItem = useCallback<ListRenderItem<T>>(
    ({ item }) => (
      <Select.Item value={item.value} label={item.label}>
        {renderOptionContent?.(item)}
      </Select.Item>
    ),
    [renderOptionContent],
  );

  const keyExtractor = useCallback((item: T) => item.value, []);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom - 16}>
        <View
          className="px-8 py-4"
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          <FooterSearch onChange={setSearchValue} placeholder={searchPlaceholder} />
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, searchPlaceholder],
  );

  return (
    <Select
      presentation="bottom-sheet"
      isDisabled={disabled}
      accessibilityLabel={accessibilityLabel}
      value={selectedOption}
      onValueChange={(option) => {
        if (option) onChange?.(option.value);
      }}
    >
      <Select.Trigger variant={variant}>
        {renderTriggerValue ? (
          renderTriggerValue(selectedOption)
        ) : (
          <>
            <Select.Value placeholder={placeholder} />
            <Select.TriggerIndicator />
          </>
        )}
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
          footerComponent={searchable ? renderFooter : undefined}
        >
          <ScrollShadow LinearGradientComponent={LinearGradient} color={themeColorOverlay}>
            <BottomSheetFlatList
              data={filteredOptions}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: searchable ? 80 : 16 }}
              initialNumToRender={20}
              windowSize={10}
              removeClippedSubviews
            />
          </ScrollShadow>
        </Select.Content>
      </Select.Portal>
    </Select>
  );
};
