import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { Text, View } from "react-native";

import { Profile } from "@/components/profile/Profile";

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: Id<"users"> }>();
  const profile = useQuery(api.users.queries.getProfile, { userId });

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-base text-muted">Profile not found</Text>
      </View>
    );
  }

  return <Profile profile={profile} />;
}
