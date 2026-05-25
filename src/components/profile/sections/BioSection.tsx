import type { Profile } from "@shared/profile/viewableProfile";
import { Text, View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<Profile, "bio">>;

export function BioSection({ bio }: Props) {
  if (!bio) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Bio</SmallHeading>
      <Text className="text-base text-foreground">{bio}</Text>
    </View>
  );
}
