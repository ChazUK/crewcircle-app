import { COUNTRIES } from "@shared/countries/countries";
import type { Profile } from "@shared/profile/viewableProfile";
import { MapPinIcon } from "lucide-react-native";
import { Text, View } from "react-native";

type Props = Partial<Pick<Profile, "city" | "country">>;

const COUNTRY_NAMES: Map<string, string> = new Map(COUNTRIES.map((c) => [c.code, c.name]));

function formatLocation(city?: string, country?: string): string | null {
  const countryName = country ? COUNTRY_NAMES.get(country) : undefined;
  const location = [city, countryName].filter(Boolean);

  if (location.length === 0) return null;

  return location.join(", ");
}

export function LocationSection({ city, country }: Props) {
  const location = formatLocation(city, country);

  if (!location) return null;

  return (
    <View className="flex-row items-center gap-1 text-foreground">
      <MapPinIcon size={16} />
      <Text className="text-base text-foreground">{location}</Text>
    </View>
  );
}
