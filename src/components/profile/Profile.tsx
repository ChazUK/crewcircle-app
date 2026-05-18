import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { ScrollView } from "react-native";

import { BioSection } from "./sections/BioSection";
import { DepartmentRolesSection } from "./sections/DepartmentRolesSection";
import { IdentitySection } from "./sections/IdentitySection";
import { LinksSection } from "./sections/LinksSection";
import { LocationSection } from "./sections/LocationSection";
import { ProductionTypesSection } from "./sections/ProductionTypesSection";
import { YearsSection } from "./sections/YearsSection";

type Props = {
  profile: ViewableProfile;
};

export function Profile({ profile }: Props) {
  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} />
      <DepartmentRolesSection profile={profile} />
      <YearsSection profile={profile} />
      <ProductionTypesSection profile={profile} />
      <LocationSection profile={profile} />
      <BioSection profile={profile} />
      <LinksSection profile={profile} />
    </ScrollView>
  );
}
