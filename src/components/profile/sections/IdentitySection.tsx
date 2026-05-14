import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Avatar, Button } from "heroui-native";
import { PencilIcon } from "lucide-react-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
  onEditIdentity?: () => void;
};

function getInitials(profile: ViewableProfile) {
  const first = profile.firstName?.[0] ?? "";
  const last = profile.lastName?.[0] ?? "";
  const combined = `${first}${last}`.trim();
  if (combined) return combined.toUpperCase();
  return "?";
}

function getDisplayName(profile: ViewableProfile) {
  const parts: string[] = [];
  if (profile.firstName) parts.push(profile.firstName);
  if (profile.lastName) parts.push(profile.lastName);
  const fullName = parts.join(" ");
  if (profile.nickname) return `${fullName} (${profile.nickname})`.trim();
  return fullName;
}

export function IdentitySection({ profile, onEditIdentity }: Props) {
  const displayName = getDisplayName(profile);
  const isSelf = profile.mode === "self" || profile.mode === "pm-self";
  const canEdit = isSelf && onEditIdentity !== undefined;

  return (
    <View className="items-center gap-3">
      <Avatar size="lg" alt={displayName || "Profile"}>
        {profile.profilePictureUrl ? (
          <Avatar.Image source={{ uri: profile.profilePictureUrl }} />
        ) : null}
        <Avatar.Fallback>{getInitials(profile)}</Avatar.Fallback>
      </Avatar>
      <View className="flex-row items-center gap-2">
        {displayName ? (
          <Text className="text-lg font-semibold text-foreground">{displayName}</Text>
        ) : null}
        {canEdit ? (
          <Button
            variant="ghost"
            isIconOnly
            onPress={onEditIdentity}
            accessibilityLabel="Edit identity"
          >
            <PencilIcon size={16} />
          </Button>
        ) : null}
      </View>
    </View>
  );
}
