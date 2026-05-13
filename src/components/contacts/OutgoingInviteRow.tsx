import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  targetLabel: string;
  targetSubtitle?: string;
  onCancel: () => void;
  isBusy?: boolean;
};

export function OutgoingInviteRow({ targetLabel, targetSubtitle, onCancel, isBusy }: Props) {
  return (
    <Surface className="flex-row items-center gap-3 rounded-xl p-3">
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
          {targetLabel}
        </Text>
        <Text numberOfLines={1} className="text-xs text-muted">
          {targetSubtitle ?? "Pending"}
        </Text>
      </View>
      <Button variant="ghost" size="sm" onPress={onCancel} isDisabled={isBusy}>
        Cancel
      </Button>
    </Surface>
  );
}
