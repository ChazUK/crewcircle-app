import { COUNTRIES } from "@/data/countries";

import { Picker } from "./Picker";

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

type Props = {
  value: string | null;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  label?: string;
};

export function CountryPicker({ value, onChange, placeholder = "Select a country", label }: Props) {
  return (
    <Picker
      value={value}
      onChange={onChange}
      options={COUNTRY_OPTIONS}
      placeholder={placeholder}
      label={label}
      listLabel="Select Country"
      snapPoints={["75%"]}
      searchable={true}
      searchPlaceholder="Search countries..."
    />
  );
}
