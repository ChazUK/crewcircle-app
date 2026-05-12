import { Stack, router } from "expo-router";
import { Button } from "heroui-native";
import { ChevronLeftIcon } from "lucide-react-native";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerLeft: () => (
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              <ChevronLeftIcon size={20} />
              <Button.Label>Profile</Button.Label>
            </Button>
          ),
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          title: "Account",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: "Support",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: "About",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          title: "Privacy Policy",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: "Terms & Conditions",
          headerBackTitle: "Settings",
        }}
      />
    </Stack>
  );
}
