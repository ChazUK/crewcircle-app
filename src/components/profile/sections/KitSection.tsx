import type { CrewProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<CrewProfile, "kit">>;

export function KitSection({ kit }: Props) {
  if (!kit || kit.length === 0) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Kit</SmallHeading>
      <View className="flex-row flex-wrap gap-2">
        {kit.map((item) => (
          <Chip key={item.id} variant="secondary" color="default" size="sm">
            {item.name}
          </Chip>
        ))}
      </View>
    </View>
  );
}
