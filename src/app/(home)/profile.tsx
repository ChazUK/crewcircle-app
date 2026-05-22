import { useClerk } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { LogOutIcon, PencilIcon, SettingsIcon } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PmProfile } from "@/components/profile/PmProfile";
import { Profile } from "@/components/profile/Profile";
import { Title } from "@/components/ui/Title";

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);

  const isSelf = profile?.mode === "self" || profile?.mode === "pm-self";

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center justify-between px-4">
        <Title title="Profile" subtitle="All about you" />
        <View className="flex-row items-center gap-1">
          {isSelf ? (
            <Button
              variant="ghost"
              isIconOnly
              accessibilityLabel="Edit Profile"
              onPress={() => router.push("/profile/edit")}
            >
              <PencilIcon />
            </Button>
          ) : null}
          <Link href="/settings" asChild>
            <Button variant="ghost" isIconOnly accessibilityLabel="Settings">
              <SettingsIcon />
            </Button>
          </Link>
        </View>
      </View>

      {profile === undefined ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : profile === null ? (
        <View className="flex-1 items-center justify-center px-4">
          <Title title="Sign in to view your profile" />
        </View>
      ) : (
        <View className="flex-1">
          {profile.mode === "pm-self" ? (
            <PmProfile profile={profile} />
          ) : (
            <Profile profile={profile} />
          )}
        </View>
      )}

      <View className="items-center px-4">
        <Button variant="danger-soft" onPress={() => signOut()}>
          <LogOutIcon size={20} />
          <Button.Label>Sign out</Button.Label>
        </Button>
      </View>
    </View>
  );
}
