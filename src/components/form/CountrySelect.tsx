import { COUNTRIES } from "@shared/countries/countries";
import { Select } from "heroui-native";
import { Fragment, useCallback } from "react";
import { Text, View } from "react-native";

import { CountryFlag } from "../ui/icons/CountryFlag";
import { BottomSheetSelect } from "./BottomSheetSelect";

const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  ...country,
  value: country.code,
  label: country.name,
}));

type CountryOption = (typeof COUNTRY_OPTIONS)[number];

type CountrySelectProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
};

export const CountrySelect = ({ value, onChange }: CountrySelectProps) => {
  const filterCountry = useCallback(
    (c: CountryOption, q: string) => c.label.toLocaleLowerCase().includes(q) || c.code.includes(q),
    [],
  );

  return (
    <BottomSheetSelect
      value={value}
      onChange={onChange}
      options={COUNTRY_OPTIONS}
      searchPlaceholder="Select country..."
      searchable={true}
      filterOption={filterCountry}
      renderOptionContent={(item) => (
        <Fragment>
          <View className="flex-1 flex-row items-center gap-2">
            <CountryFlag iso2={item.code} size={20} />
            <Select.ItemLabel />
          </View>
          <Text className="text-muted">{item.code}</Text>
          <Select.ItemIndicator />
        </Fragment>
      )}
    />
  );
};
