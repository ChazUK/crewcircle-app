import { Stack } from "expo-router";

import { HeaderBack } from "@/components/ui/HeaderBack";

export default function AccountLayout() {
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
          title: "Account",
          headerLeft: () => <HeaderBack label="Settings" />,
        }}
      />
      <Stack.Screen name="change-password" options={{ title: "Change password" }} />
      <Stack.Screen name="delete-account" options={{ title: "Delete account" }} />
    </Stack>
  );
}
