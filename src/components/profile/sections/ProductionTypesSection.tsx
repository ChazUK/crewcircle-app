import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Card, Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

function hasProductionTypes(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { productionTypes: string[] | undefined }
> & {
  productionTypes: string[];
} {
  return (
    "productionTypes" in profile &&
    Array.isArray(profile.productionTypes) &&
    profile.productionTypes.length > 0
  );
}

export function ProductionTypesSection({ profile }: Props) {
  if (hasProductionTypes(profile)) {
    return (
      <View className="gap-2">
        <Text className="text-sm font-medium text-muted">Production Types</Text>
        <View className="flex-row flex-wrap gap-2">
          {profile.productionTypes.map((type) => (
            <Chip key={type} variant="secondary" size="sm">
              {type}
            </Chip>
          ))}
        </View>
      </View>
    );
  }

  if (profile.mode === "self") {
    return (
      <Card variant="secondary">
        <Card.Body>
          <Text className="text-sm text-muted">Add the types of productions you work on</Text>
        </Card.Body>
      </Card>
    );
  }

  return null;
}
