import { COUNTRIES } from "@shared/countries/countries";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

const COUNTRY_NAME_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

type Props = {
  profile: ViewableProfile;
};

function hasPassports(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { passports: string[] | undefined }
> & {
  passports: string[];
} {
  return "passports" in profile && Array.isArray(profile.passports) && profile.passports.length > 0;
}

export function PassportsSection({ profile }: Props) {
  if (!hasPassports(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Passports</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.passports.map((code) => (
          <Chip key={code} variant="secondary" size="sm">
            {COUNTRY_NAME_BY_CODE.get(code) ?? code}
          </Chip>
        ))}
      </View>
    </View>
  );
}
