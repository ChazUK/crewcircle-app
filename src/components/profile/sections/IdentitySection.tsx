import { getDisplayName } from "@shared/profile/getDisplayName";
import { getInitials } from "@shared/profile/getInitials";
import type { Profile } from "@shared/profile/viewableProfile";
import { Image } from "expo-image";
import { Avatar, Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: Pick<Profile, "firstName" | "lastName"> &
    Partial<Pick<Profile, "profilePictureUrl" | "nickname">>;
};

export function IdentitySection({ profile }: Props) {
  const displayName = getDisplayName({ profile });

  return (
    <View className="gap-2">
      <View className="relative self-start">
        <Avatar className="size-24 rounded-2xl shadow-md" alt={displayName || "Profile"}>
          {profile.profilePictureUrl ? (
            <Avatar.Image source={{ uri: profile.profilePictureUrl }} asChild>
              <Image style={{ width: "100%", height: "100%" }} contentFit="cover" />
            </Avatar.Image>
          ) : null}
          <Avatar.Fallback delayMs={200}>{getInitials({ profile })}</Avatar.Fallback>
        </Avatar>
        <Chip className="absolute -right-1 -bottom-1 bg-green-400" size="sm">
          <Chip.Label className="text-surface-foreground">Open</Chip.Label>
        </Chip>
      </View>
      <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
        {displayName}
      </Text>
    </View>
  );
}
