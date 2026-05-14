import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

type CrewProfileWithDeptRoles = Extract<ViewableProfile, { userType: "crew" }>;

function isCrewWithDeptRoles(
  profile: ViewableProfile,
): profile is CrewProfileWithDeptRoles & { department: string; roles: string[] } {
  return (
    profile.userType === "crew" &&
    typeof (profile as CrewProfileWithDeptRoles).department === "string" &&
    Array.isArray((profile as CrewProfileWithDeptRoles).roles) &&
    ((profile as CrewProfileWithDeptRoles).roles?.length ?? 0) > 0
  );
}

export function DepartmentRolesSection({ profile }: Props) {
  if (!isCrewWithDeptRoles(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">{profile.department}</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.roles.map((role) => (
          <Chip key={role} variant="secondary" size="sm">
            {role}
          </Chip>
        ))}
      </View>
    </View>
  );
}
