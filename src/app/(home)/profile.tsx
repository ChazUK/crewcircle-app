import { useClerk, useUser } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, PressableFeedback, Separator } from "heroui-native";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Text, View } from "react-native";

function formatPhone(phone: string | undefined | null): string {
  if (!phone) return "Not set";
  try {
    const parsed = parsePhoneNumberFromString(phone);
    return parsed?.formatNational() ?? phone;
  } catch {
    return phone;
  }
}

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  return (
    <View className="flex-1 pt-8">
      <View className="items-center gap-2 py-6">
        <Text className="text-2xl font-bold">Profile</Text>
        <Text className="text-base text-default-500">{user?.emailAddresses[0]?.emailAddress}</Text>
      </View>

      <Separator />

      <PressableFeedback
        onPress={() => router.push("/settings/phone")}
        accessibilityRole="button"
        accessibilityLabel="Change phone number"
      >
        <View className="flex-row items-center justify-between px-4 py-4">
          <Text className="text-base">Phone number</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-base text-default-500">{formatPhone(currentUser?.phone)}</Text>
            <Text className="text-default-400 text-lg">›</Text>
          </View>
        </View>
      </PressableFeedback>

      <Separator />

      <View className="items-center mt-8">
        <Button variant="danger-soft" onPress={() => signOut()}>
          Sign out
        </Button>
      </View>
    </View>
  );
}
