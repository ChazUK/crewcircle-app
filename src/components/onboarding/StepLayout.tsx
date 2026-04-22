import { Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function StepLayout({ title, subtitle, children }: Props) {
  return (
    <View className="flex-1 gap-6 mx-4">
      <View>
        <Text className="text-4xl font-bold leading-none mb-2">{title}</Text>
        {subtitle && <Text className="text-base text-muted">{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}
