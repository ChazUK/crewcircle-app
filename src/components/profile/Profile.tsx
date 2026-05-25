import type { Profile } from "@shared/profile/viewableProfile";
import { ScrollView } from "react-native";

import { usePictureUpload } from "./PictureUploadFlow";
import { BioSection } from "./sections/BioSection";
import { CertificationsSection } from "./sections/CertificationsSection";
import { DepartmentRolesSection } from "./sections/DepartmentRolesSection";
import { DrivingLicencesSection } from "./sections/DrivingLicencesSection";
import { IdentitySection } from "./sections/IdentitySection";
import { KitSection } from "./sections/KitSection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { LinksSection } from "./sections/LinksSection";
import { LocationSection } from "./sections/LocationSection";
import { MembershipsSection } from "./sections/MembershipsSection";
import { PassportsSection } from "./sections/PassportsSection";
import { WorkEligibilitySection } from "./sections/WorkEligibilitySection";
import { YearsSection } from "./sections/YearsSection";

type Props = {
  profile: Profile;
};

export function Profile({ profile }: Props) {
  const pickAndUpload = usePictureUpload();

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} onPicturePress={pickAndUpload} />
      <DepartmentRolesSection {...profile} />
      <YearsSection {...profile} />
      <PassportsSection {...profile} />
      <DrivingLicencesSection {...profile} />
      <WorkEligibilitySection {...profile} />
      <KitSection {...profile} />
      <LanguagesSection {...profile} />
      <CertificationsSection {...profile} />
      <MembershipsSection {...profile} />
      <LocationSection {...profile} />
      <BioSection {...profile} />
      <LinksSection {...profile} />
    </ScrollView>
  );
}
