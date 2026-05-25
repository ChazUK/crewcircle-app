import type { Profile } from "@shared/profile/viewableProfile";
import { ScrollView } from "react-native";

import { usePictureUpload } from "./PictureUploadFlow";
import { BioSection } from "./sections/BioSection";
import { IdentitySection } from "./sections/IdentitySection";
import { LinksSection } from "./sections/LinksSection";
import { LocationSection } from "./sections/LocationSection";
import { ProductionCompanySection } from "./sections/ProductionCompanySection";

type Props = {
  profile: Extract<Profile, { mode: "pm-self" }>;
};

export function PmProfile({ profile }: Props) {
  const pickAndUpload = usePictureUpload();

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} onPicturePress={pickAndUpload} />
      <LocationSection profile={profile} />
      <ProductionCompanySection profile={profile} />
      <BioSection profile={profile} />
      <LinksSection profile={profile} />
    </ScrollView>
  );
}
