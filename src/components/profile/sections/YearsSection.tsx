import type { Profile } from "@shared/profile/viewableProfile";
import { Text, View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";
import { computeYearsInDepartment } from "@/lib/profile/computeYearsInDepartment";

type Props = Partial<Pick<Profile, "department" | "startYearInDepartment">>;

export function YearsSection({ startYearInDepartment, department }: Props) {
  if (!startYearInDepartment || !department) return null;

  const years = computeYearsInDepartment(startYearInDepartment, new Date());
  const label = years === 1 ? "1 year" : `${years} years`;

  return (
    <View className="gap-1">
      <SmallHeading>Experience</SmallHeading>
      <Text className="text-base text-foreground">
        {label} in {department}
      </Text>
    </View>
  );
}
