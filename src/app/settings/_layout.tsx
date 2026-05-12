import { Stack } from "expo-router";

import { HeaderBack } from "@/components/ui/HeaderBack";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        headerBackTitleStyle: { fontSize: 14 },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerLeft: () => <HeaderBack label="Profile" />,
        }}
      />
      <Stack.Screen name="account" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="support" options={{ title: "Support" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
      <Stack.Screen name="privacy-policy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="terms" options={{ title: "Terms & Conditions" }} />
    </Stack>
  );
}
