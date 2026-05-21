import type { MembershipEntry, ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

function hasMemberships(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { memberships: MembershipEntry[] | undefined }
> & {
  memberships: MembershipEntry[];
} {
  return (
    "memberships" in profile && Array.isArray(profile.memberships) && profile.memberships.length > 0
  );
}

export function MembershipsSection({ profile }: Props) {
  if (!hasMemberships(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Memberships</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.memberships.map((m) => (
          <Chip key={m.id} variant="secondary" size="sm">
            {m.memberNumber ? `${m.name} (${m.memberNumber})` : m.name}
          </Chip>
        ))}
      </View>
    </View>
  );
}
