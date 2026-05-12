import { useClerk, useUser } from "@clerk/expo";
import { Link } from "expo-router";
import { Avatar, Button } from "heroui-native";
import { LogOutIcon, SettingsIcon } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Title } from "@/components/ui/Title";

function getInitials(user: ReturnType<typeof useUser>["user"]) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  if (initials) return initials.toUpperCase();
  return user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? "";
}

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const insets = useSafeAreaInsets();

  const email = user?.emailAddresses[0]?.emailAddress;

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center justify-between px-4">
        <Title title="Profile" subtitle="All about you" />
        <Link href="/settings" asChild>
          <Button variant="ghost" isIconOnly>
            <SettingsIcon />
          </Button>
        </Link>
      </View>

      <View className="flex-1 items-center px-4 pt-8 gap-3">
        <Avatar size="lg">
          {user?.imageUrl && <Avatar.Image source={{ uri: user.imageUrl }} />}
          <Avatar.Fallback>{getInitials(user)}</Avatar.Fallback>
        </Avatar>
        {user?.fullName && (
          <Text className="text-lg font-semibold text-foreground">{user.fullName}</Text>
        )}
        {email && <Text className="text-base text-muted">{email}</Text>}
      </View>

      <View className="items-center px-4">
        <Button variant="danger-soft" onPress={() => signOut()}>
          <LogOutIcon size={20} />
          <Button.Label>Sign out</Button.Label>
        </Button>
      </View>
    </View>
  );
}
