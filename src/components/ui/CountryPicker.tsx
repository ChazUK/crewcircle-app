import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { COUNTRIES } from "@/data/countries";

type Country = { code: string; name: string };

type Props = {
  value: string | null;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  label?: string;
};

export function CountryPicker({ value, onChange, placeholder = "Select a country", label }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedCountry = useMemo(
    () => (value ? COUNTRIES.find((c) => c.code === value) : null),
    [value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const lower = search.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(lower));
  }, [search]);

  const openSheet = useCallback(() => {
    setSearch("");
    setIsOpen(true);
    bottomSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleSelect = useCallback(
    (country: Country) => {
      onChange(country.code);
      closeSheet();
    },
    [onChange, closeSheet],
  );

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setIsOpen(false);
      setSearch("");
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Country }) => (
      <Pressable
        style={styles.row}
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <Text style={styles.rowText}>{item.name}</Text>
      </Pressable>
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback((item: Country) => item.code, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      {label ? (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      ) : null}

      <Pressable
        style={styles.field}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="Opens a searchable list of countries"
        accessibilityValue={{ text: selectedCountry?.name ?? placeholder }}
      >
        <Text style={selectedCountry ? styles.fieldValue : styles.fieldPlaceholder}>
          {selectedCountry ? selectedCountry.name : placeholder}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {isOpen ? (
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={["75%"]}
          enablePanDownToClose
          onChange={handleSheetChange}
          accessibilityLabel="Country picker"
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Country</Text>
          </View>

          <View style={styles.searchContainer}>
            <BottomSheetTextInput
              style={styles.searchInput}
              placeholder="Search countries…"
              value={search}
              onChangeText={setSearch}
              autoFocus
              accessibilityLabel="Search countries"
              returnKeyType="search"
            />
          </View>

          <BottomSheetFlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          />
        </BottomSheet>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  fieldValue: {
    fontSize: 16,
    color: "#111",
  },
  fieldPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  chevron: {
    fontSize: 20,
    color: "#999",
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f5f5f5",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  rowText: {
    fontSize: 16,
    color: "#111",
  },
});
