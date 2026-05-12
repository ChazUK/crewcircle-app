import { useClerk, useUser } from "@clerk/expo";
import { Link } from "expo-router";
import { Button } from "heroui-native";
import { LogOutIcon, SettingsIcon } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Title } from "@/components/ui/Title";

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center justify-between px-4">
        <Title title="Profile" />
        <Link href="/settings" asChild>
          <Button variant="ghost" isIconOnly>
            <SettingsIcon />
          </Button>
        </Link>
      </View>

      <Text className="text-base text-default-500">{user?.emailAddresses[0]?.emailAddress}</Text>

      <View className="items-center ">
        <Button variant="danger-soft" onPress={() => signOut()}>
          <LogOutIcon size={20} />
          <Button.Label>Sign out</Button.Label>
        </Button>
      </View>
    </View>
  );
}
