import { Button } from "heroui-native";
import { Text, View } from "react-native";

export type ActiveStep = "google" | "microsoft" | "ical" | "native";

type Props = {
  onSelectProvider: (step: ActiveStep) => void;
};

export function CalendarAddSection({ onSelectProvider }: Props) {
  return (
    <View className="mt-6 gap-3">
      <Text className="px-1 text-sm font-semibold text-foreground">Add Calendar</Text>
      <View className="gap-2">
        <Button
          variant="secondary"
          onPress={() => onSelectProvider("google")}
          accessibilityLabel="Connect Google Calendar"
          className="w-full"
        >
          Google Calendar
        </Button>
        <Button
          variant="secondary"
          onPress={() => onSelectProvider("microsoft")}
          accessibilityLabel="Connect Microsoft Calendar"
          className="w-full"
        >
          Microsoft Calendar
        </Button>
        <Button
          variant="secondary"
          onPress={() => onSelectProvider("ical")}
          accessibilityLabel="Connect iCal or Webcal calendar"
          className="w-full"
        >
          iCal / Webcal
        </Button>
        <Button
          variant="secondary"
          onPress={() => onSelectProvider("native")}
          accessibilityLabel="Connect device calendar"
          className="w-full"
        >
          Device Calendar
        </Button>
      </View>
    </View>
  );
}
