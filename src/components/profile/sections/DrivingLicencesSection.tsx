import type { CrewProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<CrewProfile, "drivingLicences">>;

export function DrivingLicencesSection({ drivingLicences }: Props) {
  if (!drivingLicences || drivingLicences.length === 0) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Driving Licences</SmallHeading>
      <View className="flex-row flex-wrap gap-2">
        {drivingLicences.map((licence) => (
          <Chip key={licence} variant="secondary" color="default" size="sm">
            {licence}
          </Chip>
        ))}
      </View>
    </View>
  );
}
