import { api } from "@convex/_generated/api";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { useMutation } from "convex/react";
import { ScrollView } from "react-native";

import { usePictureUpload } from "./PictureUploadFlow";
import { BioSection } from "./sections/BioSection";
import { CertificationsSection } from "./sections/CertificationsSection";
import { CvSection } from "./sections/CvSection";
import { DepartmentRolesSection } from "./sections/DepartmentRolesSection";
import { DrivingLicencesSection } from "./sections/DrivingLicencesSection";
import { IdentitySection } from "./sections/IdentitySection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { LinksSection } from "./sections/LinksSection";
import { LocationSection } from "./sections/LocationSection";
import { MembershipsSection } from "./sections/MembershipsSection";
import { PassportsSection } from "./sections/PassportsSection";
import { ProductionTypesSection } from "./sections/ProductionTypesSection";
import { VisibilityToggleSection } from "./sections/VisibilityToggleSection";
import { WorkEligibilitySection } from "./sections/WorkEligibilitySection";
import { YearsSection } from "./sections/YearsSection";

type Props = {
  profile: ViewableProfile;
};

export function Profile({ profile }: Props) {
  const pickAndUpload = usePictureUpload();
  const updateVisibility = useMutation(
    api.users.mutations.updateProfileVisibility.updateProfileVisibility,
  );

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} onPicturePress={pickAndUpload} />
      <DepartmentRolesSection profile={profile} />
      <YearsSection profile={profile} />
      <ProductionTypesSection profile={profile} />
      <PassportsSection profile={profile} />
      <DrivingLicencesSection profile={profile} />
      <WorkEligibilitySection profile={profile} />
      <LanguagesSection profile={profile} />
      <CertificationsSection profile={profile} />
      <MembershipsSection profile={profile} />
      <LocationSection profile={profile} />
      <BioSection profile={profile} />
      <LinksSection profile={profile} />
      <CvSection profile={profile} />
      {profile.mode === "self" && (
        <VisibilityToggleSection
          isPublic={profile.isPublic}
          onToggle={(value) => updateVisibility({ isPublic: value })}
        />
      )}
    </ScrollView>
  );
}
