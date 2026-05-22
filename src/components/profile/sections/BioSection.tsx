import type { Profile } from "@shared/profile/viewableProfile";
import { Text, View } from "react-native";

type Props = Pick<Profile, "bio">;

export function BioSection({ bio }: Props) {
  if (!bio) return null;

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-muted">Bio</Text>
      <Text className="text-base text-foreground">{bio}</Text>
    </View>
  );
}
