import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { ScrollView } from "react-native";

import { DepartmentRolesSection } from "./sections/DepartmentRolesSection";
import { IdentitySection } from "./sections/IdentitySection";

type Props = {
  profile: ViewableProfile;
};

export function Profile({ profile }: Props) {
  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} />
      <DepartmentRolesSection profile={profile} />
    </ScrollView>
  );
}
