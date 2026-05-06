import {
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import {
  Description,
  InputGroup,
  ScrollShadow,
  Select,
  Separator,
  useThemeColor,
} from "heroui-native";
import parsePhoneNumberFromString, { CountryCode, getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ListRenderItem, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheetSearch } from "@/components/form/BottomSheetSearch";
import { COUNTRIES, Country } from "@/lib/countries/countries";

import { CountryFlag } from "../ui/icons/CountryFlag";

type DialCodeOption = Country & {
  value: string;
  label: string;
};

type Normalized = {
  e164: string | null;
  isValid: boolean;
};

const DIAL_CODES: DialCodeOption[] = COUNTRIES.map((country) => ({
  ...country,
  value: country.code,
  label: country.name,
}));

const DEFAULT_DIAL_CODE =
  DIAL_CODES.find((option) => option.code === getDeviceCountry()) || DIAL_CODES[0];

const PhoneNumberInput = () => {
  const [phone, setPhone] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [normalized, setNormalized] = useState<Normalized>({ e164: null, isValid: false });
  const [dialCode, setDialCode] = useState<DialCodeOption>(DEFAULT_DIAL_CODE);
  const themeColorOverlay = useThemeColor("overlay");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const next = normalize(phone, dialCode.code);
    setNormalized(next);
  }, [phone, dialCode]);

  const filteredOptions = useMemo(() => {
    const q = searchValue.trim().toLocaleLowerCase();
    if (!q) return DIAL_CODES;
    return DIAL_CODES.filter((option) => option.name.toLowerCase().includes(q));
  }, [searchValue]);

  const renderItem = useCallback<ListRenderItem<DialCodeOption>>(
    ({ item }) => (
      <Select.Item value={item.value} label={item.label}>
        <View className="flex-row items-center gap-2 flex-1">
          <CountryFlag iso2={item.code} size={20} />
          <Select.ItemLabel />
        </View>
        <Text style={{ color: "#888" }}>{item.dialCode}</Text>
        <Select.ItemIndicator />
      </Select.Item>
    ),
    [],
  );

  const keyExtractor = useCallback((item: DialCodeOption) => item.value, []);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom - 16}>
        <View
          className="px-8 py-4"
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          <FooterSearch onChange={setSearchValue} placeholder="Search dial code..." />
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom],
  );

  return (
    <View className="flex-1">
      <InputGroup>
        <InputGroup.Prefix className="flex-row">
          <Select
            presentation="bottom-sheet"
            value={dialCode}
            onValueChange={(value) => {
              const found = DIAL_CODES.find((d) => d.value === value?.value);
              if (found) setDialCode(found);
            }}
          >
            <Select.Trigger variant="unstyled" className="flex-row items-center gap-1">
              <CountryFlag iso2={dialCode.code} size={20} />
              <Text className="text-sm font-medium text-foreground">{dialCode.dialCode}</Text>
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay className="bg-black/50" />
              <Select.Content
                presentation="bottom-sheet"
                snapPoints={["75%", "90%"]}
                keyboardBehavior="extend"
                enableDynamicSizing={false}
                enableOverDrag={false}
                contentContainerClassName="flex-1 h-full"
                footerComponent={renderFooter}
              >
                <ScrollShadow LinearGradientComponent={LinearGradient} color={themeColorOverlay}>
                  <BottomSheetFlatList
                    data={filteredOptions}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    initialNumToRender={20}
                    windowSize={10}
                    removeClippedSubviews
                  />
                </ScrollShadow>
              </Select.Content>
            </Select.Portal>
          </Select>
          <Separator orientation="vertical" className="h-5" />
        </InputGroup.Prefix>
        <InputGroup.Input
          value={phone}
          onChangeText={setPhone}
          placeholder={phoneNumberPlaceholder(dialCode.code)}
          keyboardType="phone-pad"
        />
      </InputGroup>
      <Description>{JSON.stringify(normalized, null, 2)}</Description>
    </View>
  );
};

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

function getDeviceCountry(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).region;
    if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
    return "GB";
  } catch {
    return "GB";
  }
}

function normalize(national: string, country: string): Normalized {
  if (!national || !country) return { e164: null, isValid: false };
  const phone = parsePhoneNumberFromString(national, country as CountryCode);
  if (phone?.isValid()) return { e164: phone.number, isValid: true };
  return { e164: null, isValid: false };
}

function phoneNumberPlaceholder(country: string): string {
  try {
    const example = getExampleNumber(
      country as CountryCode,
      examples as Parameters<typeof getExampleNumber>[1],
    );
    return example?.formatNational() ?? "";
  } catch {
    return "";
  }
}

export default PhoneNumberInput;
