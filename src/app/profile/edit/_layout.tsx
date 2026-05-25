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
          title: "Edit Profile",
          headerLeft: () => <HeaderBack label="Profile" />,
        }}
      />
      <Stack.Screen name="bio-links" options={{ title: "Bio & Links" }} />
      <Stack.Screen name="cv" options={{ title: "CV" }} />
      <Stack.Screen name="department-and-roles" options={{ title: "Department" }} />
      <Stack.Screen name="driving-licences" options={{ title: "Driving Licences" }} />
      <Stack.Screen name="identity" options={{ title: "Identity" }} />
      <Stack.Screen name="languages" options={{ title: "Languages" }} />
      <Stack.Screen name="location" options={{ title: "Location" }} />
      <Stack.Screen name="passports" options={{ title: "Passports" }} />
      <Stack.Screen name="production-company" options={{ title: "Production Company" }} />
      <Stack.Screen name="work-eligibility" options={{ title: "Work Eligibility" }} />
    </Stack>
  );
}
