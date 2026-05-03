import { format, startOfMonth } from "date-fns";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarManagementSheet } from "@/components/calendars/CalendarManagementSheet";
import { GearIcon } from "@/components/ui/icons/GearIcon";

export default function Diary() {
  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [_visibleMonth, setVisibleMonth] = useState<string>(() => {
    return format(startOfMonth(new Date()), "yyyy-MM-dd");
  });
  const [isManagementSheetOpen, setIsManagementSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const [accent, accentForeground, foreground, muted] = useThemeColor([
    "accent",
    "accent-foreground",
    "foreground",
    "muted",
  ]);

  return (
    <>
      <ScrollView style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-4">
            <Text className="text-2xl font-bold text-foreground">My Diary</Text>
            <Pressable
              onPress={() => setIsManagementSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Link external calendars"
              hitSlop={10}
              className="p-1"
            >
              <GearIcon size={22} />
            </Pressable>
          </View>

          <Calendar
            current={todayIso}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(m: DateData) => setVisibleMonth(m.dateString)}
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              selectedDayBackgroundColor: accent,
              selectedDayTextColor: accentForeground,
              todayTextColor: accent,
              dayTextColor: foreground,
              textDisabledColor: muted,
              monthTextColor: foreground,
              arrowColor: accent,
              textDayFontWeight: "400",
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
              dotColor: accent,
              selectedDotColor: accentForeground,
            }}
            style={{ marginHorizontal: 8 }}
          />

          <View className="mt-4 px-4">
            <Text className="text-sm text-foreground/60">{format(selectedDate, "EEEE")}</Text>
            <Text className="text-sm text-foreground/60">{format(selectedDate, "d MMMM")}</Text>
          </View>
        </View>
      </ScrollView>

      <CalendarManagementSheet
        isOpen={isManagementSheetOpen}
        onClose={() => setIsManagementSheetOpen(false)}
      />
    </>
  );
}
