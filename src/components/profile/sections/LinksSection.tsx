import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Image } from "expo-image";
import { GlobeIcon } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

type ProfileWithLinks = Extract<ViewableProfile, { website: string | undefined }>;

function hasLinks(profile: ViewableProfile): profile is ProfileWithLinks {
  return "website" in profile || "imdbId" in profile;
}

function imdbUrl(id: string): string {
  return `https://www.imdb.com/name/${id}/`;
}

export function LinksSection({ profile }: Props) {
  if (!hasLinks(profile)) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Links</Text>
      {profile.website ? (
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => Linking.openURL(profile.website!)}
          accessibilityRole="link"
        >
          <GlobeIcon size={16} className="text-primary" />
          <Text className="text-primary text-base">{profile.website}</Text>
        </Pressable>
      ) : null}
      {"imdbId" in profile && profile.imdbId ? (
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => Linking.openURL(imdbUrl(profile.imdbId!))}
          accessibilityRole="link"
        >
          <Image source={require("@/assets/icons/imdb.svg")} style={{ width: 16, height: 16 }} />
          <Text className="text-primary text-base">IMDB Profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
