import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

function hasDrivingLicences(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { drivingLicences: string[] | undefined }
> & {
  drivingLicences: string[];
} {
  return (
    "drivingLicences" in profile &&
    Array.isArray(profile.drivingLicences) &&
    profile.drivingLicences.length > 0
  );
}

export function DrivingLicencesSection({ profile }: Props) {
  if (!hasDrivingLicences(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Driving Licences</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.drivingLicences.map((licence) => (
          <Chip key={licence} variant="secondary" size="sm">
            {licence}
          </Chip>
        ))}
      </View>
    </View>
  );
}
