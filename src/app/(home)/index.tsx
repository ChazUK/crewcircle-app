import { useUser } from "@clerk/expo";
import { Text, View } from "react-native";

export default function Home() {
  const { user } = useUser();

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-2xl font-bold">Welcome to CrewCircle!</Text>
      <Text className="text-base text-default-500 mt-2">
        {user?.emailAddresses[0].emailAddress}
      </Text>
    </View>
  );
}
