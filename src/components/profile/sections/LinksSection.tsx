import { imdbUrl } from "@shared/profile/imdbUrl";
import type { Profile } from "@shared/profile/viewableProfile";
import { View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

import { ProfileLink } from "./ProfileLink";

type Props = Partial<Pick<Profile, "website" | "cvUrl" | "imdbId">>;

export function LinksSection({ website, cvUrl, imdbId }: Props) {
  if (!website && !cvUrl && !imdbId) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Links</SmallHeading>
      <View className="flex-row flex-wrap gap-2">
        {website ? <ProfileLink url={website} type="url" /> : null}
        {imdbId ? <ProfileLink url={imdbUrl(imdbId)} type="imdb" /> : null}
        {cvUrl ? <ProfileLink url={cvUrl} type="download" /> : null}
      </View>
    </View>
  );
}
