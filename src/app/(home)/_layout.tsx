import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Tabs } from "expo-router";

import { PushTokenRegistrar } from "@/components/contacts/PushTokenRegistrar";

export default function HomeLayout() {
  const incomingCount = useQuery(api.notifications.queries.myUnreadIncomingInviteCount, {}) ?? 0;

  return (
    <>
      <PushTokenRegistrar />
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: () => null }} />
        <Tabs.Screen name="diary" options={{ title: "My Diary", tabBarIcon: () => null }} />
        <Tabs.Screen name="circles" options={{ title: "Circles", tabBarIcon: () => null }} />
        <Tabs.Screen
          name="requests"
          options={{
            title: "Requests",
            tabBarIcon: () => null,
            tabBarBadge: incomingCount > 0 ? incomingCount : undefined,
          }}
        />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: () => null }} />
      </Tabs>
    </>
  );
}
