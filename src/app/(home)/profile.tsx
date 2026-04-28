import { useClerk, useUser } from "@clerk/expo";
import { Button } from "heroui-native";
import { Text, View } from "react-native";

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Text className="text-2xl font-bold">Profile</Text>
      <Text className="text-base text-default-500">{user?.emailAddresses[0]?.emailAddress}</Text>
      <Button variant="danger-soft" onPress={() => signOut()}>
        Sign out
      </Button>
    </View>
  );
}
