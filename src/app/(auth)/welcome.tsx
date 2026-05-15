import { Image } from "expo-image";
import { Link } from "expo-router";
import { Button } from "heroui-native";
import { Text, useColorScheme, View } from "react-native";

import { SafeAreaView } from "@/components/ui/SafeAreaView";

export default function Page() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 bg-background">
      <Image
        source={
          isDark
            ? require("@/assets/bg/welcome-dark.png")
            : require("@/assets/bg/welcome-light.png")
        }
        style={{ position: "absolute", inset: 0 }}
        contentFit="cover"
      />
      <SafeAreaView className="flex-1">
        <View className="mx-4 flex-1 justify-center">
          <View className="mb-8 h-32 w-32 items-center justify-center rounded-2xl bg-blue-500">
            <Image
              source={require("@/assets/icons/splash-icon-dark.png")}
              style={{ width: 128, height: 128 }}
            />
          </View>
          <Text className="mb-4 text-5xl leading-none font-bold text-foreground">
            Build the{"\n"}crew you need.
          </Text>
          <Text className="text-lg text-foreground">
            Schedule shifts, fill gaps, and hire trusted pros - all in one place.
          </Text>
        </View>

        <View className="mx-4 flex flex-col gap-4">
          <Link href="/sign-up" asChild>
            <Button variant="primary" size="lg" className="w-full rounded-xl">
              Get started
            </Button>
          </Link>
          <Text className="text-center text-base text-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-accent">
              Sign in
            </Link>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
