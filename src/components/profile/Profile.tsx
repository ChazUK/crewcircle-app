import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { ScrollView } from "react-native";

import { usePictureUpload } from "./PictureUploadFlow";
import { BioSection } from "./sections/BioSection";
import { CvSection } from "./sections/CvSection";
import { DepartmentRolesSection } from "./sections/DepartmentRolesSection";
import { IdentitySection } from "./sections/IdentitySection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { LinksSection } from "./sections/LinksSection";
import { LocationSection } from "./sections/LocationSection";
import { ProductionTypesSection } from "./sections/ProductionTypesSection";
import { WorkEligibilitySection } from "./sections/WorkEligibilitySection";
import { YearsSection } from "./sections/YearsSection";

type Props = {
  profile: ViewableProfile;
};

export function Profile({ profile }: Props) {
  const pickAndUpload = usePictureUpload();

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} onPicturePress={pickAndUpload} />
      <DepartmentRolesSection profile={profile} />
      <YearsSection profile={profile} />
      <ProductionTypesSection profile={profile} />
      <WorkEligibilitySection profile={profile} />
      <LanguagesSection profile={profile} />
      <LocationSection profile={profile} />
      <BioSection profile={profile} />
      <LinksSection profile={profile} />
      <CvSection profile={profile} />
    </ScrollView>
  );
}
