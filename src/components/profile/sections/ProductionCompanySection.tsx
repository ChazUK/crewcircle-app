import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

function hasProductionCompany(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { productionCompany: string | undefined }
> & {
  productionCompany: string;
} {
  return (
    "productionCompany" in profile &&
    typeof profile.productionCompany === "string" &&
    profile.productionCompany.length > 0
  );
}

export function ProductionCompanySection({ profile }: Props) {
  if (!hasProductionCompany(profile)) return null;

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-muted">Production Company</Text>
      <Text className="text-base text-foreground">{profile.productionCompany}</Text>
    </View>
  );
}
