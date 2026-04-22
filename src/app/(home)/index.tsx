import { useClerk, useUser } from "@clerk/expo";
import { Pressable, Text, View } from "react-native";

import { layout } from "@/styles/layout";

export default function Home() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <View style={layout.centered}>
      <Text>Welcome to CrewCircle!</Text>
      <Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
      <Pressable onPress={() => signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </View>
  );
}
