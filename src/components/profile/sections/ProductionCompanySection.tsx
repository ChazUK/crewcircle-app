import type { ProductionManagerProfile } from "@shared/profile/viewableProfile";
import { Text, View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<ProductionManagerProfile, "productionCompany">>;

export function ProductionCompanySection({ productionCompany }: Props) {
  if (!productionCompany) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Production Company</SmallHeading>
      <Text className="text-base text-foreground">{productionCompany}</Text>
    </View>
  );
}
