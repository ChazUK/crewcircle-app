import { Switch } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  isPublic: boolean;
  onToggle: (value: boolean) => void;
};

export function VisibilityToggleSection({ isPublic, onToggle }: Props) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">Discoverable</Text>
        <Text className="text-xs text-muted">
          Allow crew who don't yet know you to find you in search
        </Text>
      </View>
      <Switch isSelected={isPublic} onSelectedChange={onToggle} />
    </View>
  );
}
