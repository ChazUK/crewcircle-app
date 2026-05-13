import { Avatar, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { formatContactName } from "@/lib/contacts/formatContactName";

export type ContactRowUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
};

type Props = {
  user: ContactRowUser;
  subtitle?: string;
  trailing?: React.ReactNode;
};

const getInitials = (user: ContactRowUser) => {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const combined = `${first}${last}`.trim();
  if (combined) return combined.toUpperCase();
  return user.email?.[0]?.toUpperCase() ?? "?";
};

export function ContactRow({ user, subtitle, trailing }: Props) {
  const displayName = formatContactName(user);
  return (
    <Surface className="flex-row items-center gap-3 rounded-xl p-3">
      <Avatar size="sm" alt={displayName}>
        {user.profilePictureUrl ? <Avatar.Image source={{ uri: user.profilePictureUrl }} /> : null}
        <Avatar.Fallback>{getInitials(user)}</Avatar.Fallback>
      </Avatar>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
          {displayName}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="text-xs text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </Surface>
  );
}
