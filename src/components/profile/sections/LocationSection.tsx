import { COUNTRIES } from "@shared/countries/countries";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

const COUNTRY_NAMES: Map<string, string> = new Map(COUNTRIES.map((c) => [c.code, c.name]));

function hasLocation(
  profile: ViewableProfile,
): profile is Extract<ViewableProfile, { city: string | undefined; country: string | undefined }> {
  return "city" in profile || "country" in profile;
}

function formatLocation(city: string | undefined, country: string | undefined): string | null {
  const countryName = country ? COUNTRY_NAMES.get(country) : undefined;
  if (city && countryName) return `${city}, ${countryName}`;
  if (city) return city;
  if (countryName) return countryName;
  return null;
}

export function LocationSection({ profile }: Props) {
  if (!hasLocation(profile)) return null;

  const display = formatLocation(profile.city, profile.country);

  if (display) {
    return (
      <View className="gap-1">
        <Text className="text-sm font-medium text-muted">Location</Text>
        <Text className="text-base text-foreground">{display}</Text>
      </View>
    );
  }

  if (profile.mode === "self") {
    return (
      <Card variant="secondary">
        <Card.Body>
          <Text className="text-sm text-muted">Add your location so people can find you</Text>
        </Card.Body>
      </Card>
    );
  }

  return null;
}
