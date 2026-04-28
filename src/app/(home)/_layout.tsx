import { Tabs } from "expo-router";

export default function HomeLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: () => null }} />
      <Tabs.Screen name="diary" options={{ title: "My Diary", tabBarIcon: () => null }} />
      <Tabs.Screen name="circles" options={{ title: "Circles", tabBarIcon: () => null }} />
      <Tabs.Screen name="requests" options={{ title: "Requests", tabBarIcon: () => null }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: () => null }} />
    </Tabs>
  );
}
