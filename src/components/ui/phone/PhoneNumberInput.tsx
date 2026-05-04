import { FieldError, Input } from "heroui-native";
import { getExampleNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { useEffect } from "react";
import { View } from "react-native";

import { CountrySelect } from "@/components/ui/phone/CountrySelect";

type PhoneValue = {
  country: string;
  national: string;
};

type Normalized = {
  e164: string | null;
  isValid: boolean;
};

type Props = {
  value: PhoneValue;
  onChange: (next: PhoneValue, normalized: Normalized) => void;
  disabled?: boolean;
  error?: string;
};

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

function getPlaceholder(country: string): string {
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

export function PhoneNumberInput({ value, onChange, disabled = false, error }: Props) {
  useEffect(() => {
    if (!value.country) {
      const country = getDeviceCountry();
      onChange({ country, national: "" }, { e164: null, isValid: false });
    }
  }, []);

  function handleCountryChange(country: string) {
    const next = { country, national: value.national };
    onChange(next, normalize(value.national, country));
  }

  function handleNationalChange(national: string) {
    const next = { country: value.country, national };
    onChange(next, normalize(national, value.country));
  }

  const placeholder = getPlaceholder(value.country);
  const hasError = Boolean(error);

  return (
    <View>
      <View className="flex-row gap-2 items-center">
        <CountrySelect value={value.country} onChange={handleCountryChange} disabled={disabled} />
        <View className="flex-1">
          <Input
            value={value.national}
            onChangeText={handleNationalChange}
            keyboardType="phone-pad"
            placeholder={placeholder}
            editable={!disabled}
            isInvalid={hasError}
            accessibilityLabel="Phone number"
          />
        </View>
      </View>
      {hasError && <FieldError isInvalid>{error}</FieldError>}
    </View>
  );
}
