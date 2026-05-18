import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

import { computeYearsInDepartment } from "@/lib/profile/computeYearsInDepartment";

type Props = {
  profile: ViewableProfile;
};

type CrewWithYears = Extract<
  ViewableProfile,
  { userType: "crew"; startYearInDepartment: number | undefined }
>;

function hasYears(
  profile: ViewableProfile,
): profile is CrewWithYears & { startYearInDepartment: number; department: string } {
  return (
    profile.userType === "crew" &&
    "startYearInDepartment" in profile &&
    typeof (profile as CrewWithYears).startYearInDepartment === "number" &&
    typeof (profile as CrewWithYears).department === "string"
  );
}

export function YearsSection({ profile }: Props) {
  if (hasYears(profile)) {
    const years = computeYearsInDepartment(profile.startYearInDepartment, new Date());
    const label = years === 1 ? "1 year" : `${years} years`;

    return (
      <View className="gap-1">
        <Text className="text-sm font-medium text-muted">Experience</Text>
        <Text className="text-base text-foreground">
          {label} in {profile.department}
        </Text>
      </View>
    );
  }

  if (profile.mode === "self" && profile.userType === "crew") {
    return (
      <Card variant="secondary">
        <Card.Body>
          <Text className="text-sm text-muted">
            Add when you started in your department to show your experience
          </Text>
        </Card.Body>
      </Card>
    );
  }

  return null;
}
