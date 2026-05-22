import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

function hasKit(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { kit: { id: string; name: string }[] | undefined }
> & {
  kit: { id: string; name: string }[];
} {
  return "kit" in profile && Array.isArray(profile.kit) && profile.kit.length > 0;
}

export function KitSection({ profile }: Props) {
  if (!hasKit(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Kit</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.kit.map((item) => (
          <Chip key={item.id} variant="secondary" size="sm">
            {item.name}
          </Chip>
        ))}
      </View>
    </View>
  );
}
