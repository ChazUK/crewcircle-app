import { Image } from "expo-image";
import { Text, View } from "react-native";
import { twMerge } from "tailwind-merge";

type Props = {
  className?: string;
};

export function LogoMark({ className }: Props) {
  return (
    <View className={twMerge("flex-row items-center self-start", className)}>
      <Image
        source={require("@/assets/icons/splash-icon-dark.png")}
        style={{ width: 40, height: 40 }}
      />
      <Text className="ml-1 text-xl font-bold">CrewCircle</Text>
    </View>
  );
}
