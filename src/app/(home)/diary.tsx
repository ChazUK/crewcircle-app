import { format } from "date-fns";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarConnectionsSheet } from "@/components/ui/CalendarConnectionsSheet";
import { GearIcon } from "@/components/ui/icons/GearIcon";

const today = new Date().toISOString().split("T")[0];

export default function Diary() {
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4">
          <Text className="text-2xl font-bold text-foreground">My Diary</Text>
          <Pressable
            onPress={() => setIsConnectionsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Link external calendars"
            hitSlop={10}
            className="p-1"
          >
            <GearIcon size={22} />
          </Pressable>
        </View>

        <Calendar
          current={today}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: "#6366f1" },
          }}
          theme={{
            backgroundColor: "transparent",
            calendarBackground: "transparent",
            selectedDayBackgroundColor: "#6366f1",
            selectedDayTextColor: "#ffffff",
            todayTextColor: "#6366f1",
            dayTextColor: "#1f2937",
            textDisabledColor: "#d1d5db",
            monthTextColor: "#1f2937",
            arrowColor: "#6366f1",
            textDayFontWeight: "400",
            textMonthFontWeight: "600",
            textDayHeaderFontWeight: "500",
          }}
          style={{ marginHorizontal: 8 }}
        />

        <View className="px-4 mt-4">
          <Text className="text-sm text-foreground/60">
            {format(new Date(selectedDate), "EEEE")}
          </Text>
          <Text className="text-sm text-foreground/60">
            {format(new Date(selectedDate), "d MMMM")}
          </Text>
        </View>
      </View>
      <CalendarConnectionsSheet isOpen={isConnectionsOpen} onOpenChange={setIsConnectionsOpen} />
    </ScrollView>
  );
}
