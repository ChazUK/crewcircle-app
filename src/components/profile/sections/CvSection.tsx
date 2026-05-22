import type { Profile } from "@shared/profile/viewableProfile";
import { Linking, Pressable, Text, View } from "react-native";

type Props = Pick<Profile, "cvUrl">;

export function CvSection({ cvUrl }: Props) {
  if (!cvUrl) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">CV</Text>
      <Pressable
        className="flex-row items-center gap-2"
        onPress={() => Linking.openURL(cvUrl)}
        accessibilityRole="link"
      >
        <Text className="text-primary text-base">View CV</Text>
      </Pressable>
    </View>
  );
}
