import { Button } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  onBack: () => void;
};

export function GoogleCalendarConnectFlow({ onBack }: Props) {
  return (
    <View className="flex-1 gap-6 py-4">
      <View className="flex-row items-center gap-2 px-1">
        <Button
          variant="tertiary"
          size="sm"
          onPress={onBack}
          accessibilityLabel="Back to calendars"
        >
          ← Back
        </Button>
        <Text className="text-base font-semibold text-foreground">Google Calendar</Text>
      </View>

      <View className="items-center gap-3 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl font-bold text-foreground">G</Text>
        </View>
        <Text className="text-sm text-muted-foreground">Connect your Google Calendar account</Text>
      </View>
    </View>
  );
}
