import type { Profile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<Profile, "workEligibility">>;

export function WorkEligibilitySection({ workEligibility }: Props) {
  if (!workEligibility || workEligibility.length === 0) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Work Eligibility</SmallHeading>
      <View className="flex-row flex-wrap gap-2">
        {workEligibility.map((region) => (
          <Chip key={region} variant="secondary" size="sm">
            {region}
          </Chip>
        ))}
      </View>
    </View>
  );
}
