import { Surface } from "heroui-native";
import { PlusIcon } from "lucide-react-native";
import { Text, View } from "react-native";

type Props = {
  label: string;
};

export function GhostSection({ label }: Props) {
  return (
    <Surface className="flex-row items-center gap-3 rounded-xl p-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
        <PlusIcon size={16} />
      </View>
      <Text className="text-sm font-medium text-muted">Add {label}</Text>
    </Surface>
  );
}
