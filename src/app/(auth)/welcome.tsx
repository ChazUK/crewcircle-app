import { Image } from "expo-image";
import { Link } from "expo-router";
import { Button } from "heroui-native";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 justify-center mx-4">
        <View className="mb-8 h-32 w-32 items-center justify-center rounded-2xl bg-blue-500">
          <Image
            source={require("@/assets/icons/splash-icon-dark.png")}
            style={{ width: 128, height: 128 }}
          />
        </View>
        <Text className="text-5xl mb-4 font-bold leading-none">Build the{"\n"}crew you need.</Text>
        <Text className="text-lg">
          Schedule shifts, fill gaps, and hire trusted pros - all in one place.
        </Text>
      </View>

      <View className="flex flex-col gap-4 mx-4">
        <Link href="/sign-up" asChild>
          <Button variant="primary" size="lg" className="w-full">
            Get started
          </Button>
        </Link>
        <Text className="text-base text-center">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary font-semibold">
            Sign in
          </Link>
        </Text>
        {__DEV__ && <Link href="/storybook">Open Storybook</Link>}
      </View>
    </SafeAreaView>
  );
}
