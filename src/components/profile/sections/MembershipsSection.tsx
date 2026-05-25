import type { CrewProfile } from "@shared/profile/viewableProfile";
import { Image } from "expo-image";
import { Surface } from "heroui-native";
import { BadgeCheckIcon } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<CrewProfile, "memberships">>;

const StyledImage = withUniwind(Image);

export function MembershipsSection({ memberships }: Props) {
  if (!memberships || memberships.length === 0) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Memberships</SmallHeading>
      <View className="gap-2">
        {memberships.map(({ id, name, memberNumber }) => {
          const logo = require(`@/assets/organisations/bectu.png`);
          return (
            <Surface
              key={id}
              className="flex-row items-center gap-2 rounded-lg p-2"
              variant="secondary"
            >
              <StyledImage
                className="size-8 rounded-md bg-surface"
                source={logo}
                contentFit="contain"
              />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {name}
                </Text>
                {memberNumber ? (
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {memberNumber}
                  </Text>
                ) : null}
              </View>
              <BadgeCheckIcon size={22} color="#1E96EA" />
            </Surface>
          );
        })}
      </View>
    </View>
  );
}
