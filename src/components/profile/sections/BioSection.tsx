import type { Profile } from "@shared/profile/viewableProfile";
import { Surface } from "heroui-native";
import { Text } from "react-native";

type Props = Partial<Pick<Profile, "bio">>;

export function BioSection({ bio }: Props) {
  if (!bio) return null;

  return (
    <Surface className="rounded-md p-2" variant="secondary">
      <Text className="text-sm text-foreground">{bio}</Text>
    </Surface>
  );
}
