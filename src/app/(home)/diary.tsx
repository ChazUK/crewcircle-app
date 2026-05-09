import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { addDays, endOfMonth, format, parseISO, startOfDay } from "date-fns";
import { Button, useThemeColor } from "heroui-native";
import { CogIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarManagementSheet } from "@/components/calendars/CalendarManagementSheet";
import { DiaryCalendarHeader } from "@/components/calendars/DiaryCalendarHeader";
import { DiaryEventList } from "@/components/calendars/DiaryEventList";

export default function Diary() {
  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isManagementSheetOpen, setIsManagementSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const [accent, accentForeground, foreground, muted] = useThemeColor([
    "accent",
    "accent-foreground",
    "foreground",
    "muted",
  ]);

  const connections = useQuery(api.calendars.queries.getConnections, {});

  const startMs = visibleMonth.getTime();
  const endMs = endOfMonth(visibleMonth).getTime() + 1;

  const events = useQuery(api.calendars.queries.getEventsForDateRange, { startMs, endMs });

  const dayStartMs = startOfDay(parseISO(selectedDate)).getTime();
  const dayEndMs = addDays(dayStartMs, 1).getTime();
  const dayEvents = useQuery(api.calendars.queries.getEventsForDate, {
    startMs: dayStartMs,
    endMs: dayEndMs,
  });

  const eventDots: Record<string, { dots: { key: string; color: string }[] }> = {};
  if (events) {
    for (const event of events) {
      const dateKey = format(new Date(event.startsAt), "yyyy-MM-dd");
      if (!eventDots[dateKey]) {
        eventDots[dateKey] = { dots: [] };
      }
      const existing = eventDots[dateKey]!;
      const connectionId = event.connectionId as string;
      if (!existing.dots.some((d) => d.key === connectionId)) {
        existing.dots.push({ key: connectionId, color: event.color });
      }
    }
  }

  const selectedMarking = {
    selected: true,
    selectedColor: accent,
  };

  const mergedMarkedDates: Record<string, object> = {};
  for (const [date, dotData] of Object.entries(eventDots)) {
    if (date === selectedDate) {
      mergedMarkedDates[date] = { ...dotData, ...selectedMarking };
    } else {
      mergedMarkedDates[date] = dotData;
    }
  }
  if (!mergedMarkedDates[selectedDate]) {
    mergedMarkedDates[selectedDate] = selectedMarking;
  }

  const hasNoConnections = connections !== undefined && connections.length === 0;

  return (
    <>
      <ScrollView style={{ flex: 1, paddingBottom: insets.bottom }}>
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
              <CogIcon />
            </Pressable>
          </View>

          <Calendar
            current={todayIso}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(m: DateData) => setVisibleMonth(new Date(m.year, m.month - 1, 1))}
            markedDates={mergedMarkedDates}
            markingType="multi-dot"
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
            customHeader={DiaryCalendarHeader}
            style={{ marginHorizontal: 8 }}
          />

          <View className="mt-4">
            <DiaryEventList events={dayEvents} />
          </View>

          {hasNoConnections && (
            <Button
              className="text-sm font-medium"
              variant="ghost"
              onPress={() => setIsManagementSheetOpen(true)}
            >
              Connect a calendar to see your events
            </Button>
          )}
        </View>
      </ScrollView>

      <CalendarManagementSheet
        isOpen={isManagementSheetOpen}
        onClose={() => setIsManagementSheetOpen(false)}
      />
    </>
  );
}
