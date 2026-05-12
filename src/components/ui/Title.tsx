import { Text, View } from "react-native";

type TitleProps = {
  title: string;
  subtitle?: string;
};

export function Title({ title, subtitle }: TitleProps) {
  return (
    <View className="flex-col-reverse flex-1">
      <Text className="text-2xl font-bold text-foreground">{title}</Text>
      {subtitle && <Text className="text-sm font-semibold text-muted uppercase">{subtitle}</Text>}
    </View>
  );
}
