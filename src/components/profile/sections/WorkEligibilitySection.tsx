import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

function hasWorkEligibility(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { workEligibility: string[] | undefined }
> & {
  workEligibility: string[];
} {
  return (
    "workEligibility" in profile &&
    Array.isArray(profile.workEligibility) &&
    profile.workEligibility.length > 0
  );
}

export function WorkEligibilitySection({ profile }: Props) {
  if (!hasWorkEligibility(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Work Eligibility</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.workEligibility.map((region) => (
          <Chip key={region} variant="secondary" size="sm">
            {region}
          </Chip>
        ))}
      </View>
    </View>
  );
}
