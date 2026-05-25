import type { Profile } from "@shared/profile/viewableProfile";
import { Text } from "react-native";

type Props = Partial<Pick<Profile, "department" | "roles">>;

export function DepartmentRolesSection({ department, roles }: Props) {
  if (!department) return null;

  const position = [...(roles || [])].join(" &middot; ");

  return (
    <Text className="text-sm text-muted">
      {position && `${position} &middot; `}
      <Text className="font-medium text-foreground">{department} dept</Text>
    </Text>
  );
}
