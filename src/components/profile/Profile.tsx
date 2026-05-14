import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { ScrollView } from "react-native";

import { GhostSection } from "./sections/GhostSection";
import { IdentitySection } from "./sections/IdentitySection";

type Props = {
  profile: ViewableProfile;
  onEditIdentity?: () => void;
};

const SELF_GHOST_LABELS = [
  "Bio",
  "Department & Roles",
  "Years",
  "Languages",
  "Production Types",
  "Work Eligibility",
  "Passports",
  "Driving Licences",
  "Kit",
  "Certifications",
  "Memberships",
];

export function Profile({ profile, onEditIdentity }: Props) {
  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <IdentitySection profile={profile} onEditIdentity={onEditIdentity} />
      {profile.mode === "self" || profile.mode === "pm-self"
        ? SELF_GHOST_LABELS.map((label) => <GhostSection key={label} label={label} />)
        : null}
    </ScrollView>
  );
}
