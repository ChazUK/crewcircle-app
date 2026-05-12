import Constants from "expo-constants";
import { Text, View } from "react-native";

export default function AboutSettings() {
  const version = Constants.expoConfig?.version ?? "—";

  return (
    <View className="flex-1 items-center justify-center bg-background px-4">
      <Text className="text-2xl font-bold text-foreground">CrewCircle</Text>
      <Text className="mt-2 text-base text-muted">Version {version}</Text>
    </View>
  );
}
