import { getCountryName } from "@shared/countries/countries";
import type { Profile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<Profile, "passports">>;

export function PassportsSection({ passports }: Props) {
  if (!passports || passports.length === 0) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Passports</SmallHeading>
      <View className="flex-row flex-wrap gap-2">
        {passports.map((code) => (
          <Chip key={code} variant="secondary" size="sm">
            {getCountryName(code)}
          </Chip>
        ))}
      </View>
    </View>
  );
}
