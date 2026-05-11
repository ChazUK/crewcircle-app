import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { addDays, endOfMonth, format, parseISO, startOfDay } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { Button, ScrollShadow, useThemeColor } from "heroui-native";
import { CalendarPlus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarConnectionList } from "@/components/calendars/CalendarConnectionList";
import { ConnectCalendarSheet } from "@/components/calendars/ConnectCalendarSheet";
import { DiaryCalendarHeader } from "@/components/calendars/DiaryCalendarHeader";
import { DiaryEventList } from "@/components/calendars/DiaryEventList";
import { DisconnectCalendarDialog } from "@/components/calendars/DisconnectCalendarDialog";
import { useCalendarSync } from "@/components/calendars/hooks/useCalendarSync";
import { useDisconnectCalendar } from "@/components/calendars/hooks/useDisconnectCalendar";

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

  const { syncingIds, syncConnection } = useCalendarSync();
  const {
    pendingId,
    isDisconnecting,
    error: disconnectError,
    requestDisconnect,
    confirm: confirmDisconnect,
    cancel: cancelDisconnect,
  } = useDisconnectCalendar();

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
    selectedDate,
  });

  type Period = { startingDay: boolean; endingDay: boolean; color: string } | { color: string };
  const periodsByDate: Record<string, Period[]> = {};

  if (events) {
    const sorted = [...events].sort((a, b) => a.startsAt - b.startsAt);
    const slotEndKey: string[] = [];

    for (const event of sorted) {
      // All-day events: trust the persisted date strings (timezone-agnostic).
      // Timed events: format the epoch ms in the viewer's local zone.
      const startKey =
        event.isAllDay && event.startDate
          ? event.startDate
          : format(startOfDay(new Date(event.startsAt)), "yyyy-MM-dd");
      const endKey =
        event.isAllDay && event.endDate
          ? event.endDate
          : format(startOfDay(new Date(event.endsAt - 1)), "yyyy-MM-dd");

      let slot = slotEndKey.findIndex((end) => end < startKey);
      if (slot === -1) slot = slotEndKey.length;
      slotEndKey[slot] = endKey;

      let cursor = parseISO(startKey);
      while (format(cursor, "yyyy-MM-dd") <= endKey) {
        const key = format(cursor, "yyyy-MM-dd");
        const arr = periodsByDate[key] ?? [];
        while (arr.length <= slot) arr.push({ color: "transparent" });
        arr[slot] = {
          startingDay: key === startKey,
          endingDay: key === endKey,
          color: event.color,
        };
        periodsByDate[key] = arr;
        cursor = addDays(cursor, 1);
      }
    }
  }

  const selectedMarking = {
    selected: true,
    selectedColor: accent,
  };

  const mergedMarkedDates: Record<string, object> = {};
  for (const [date, periodData] of Object.entries(periodsByDate)) {
    if (date === selectedDate) {
      mergedMarkedDates[date] = { periods: periodData, ...selectedMarking };
    } else {
      mergedMarkedDates[date] = { periods: periodData };
    }
  }
  if (!mergedMarkedDates[selectedDate]) {
    mergedMarkedDates[selectedDate] = selectedMarking;
  }

  const hasConnections = connections && connections?.length > 0;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-2xl font-bold text-foreground">My Diary</Text>
        <Pressable
          onPress={() => setIsManagementSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Link external calendars"
          hitSlop={10}
          className="p-1"
        >
          <CalendarPlus />
        </Pressable>
      </View>
      <Calendar
        current={todayIso}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        onMonthChange={(m: DateData) => setVisibleMonth(new Date(m.year, m.month - 1, 1))}
        markedDates={mergedMarkedDates}
        markingType="multi-period"
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
      <ScrollShadow style={{ flex: 1 }} LinearGradientComponent={LinearGradient}>
        <ScrollView style={{ flex: 1 }}>
          <View className="flex-1" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-1 gap-4 mt-4 mx-4">
              <DiaryEventList events={dayEvents} />

              {hasConnections ? (
                <CalendarConnectionList
                  connections={connections}
                  syncingIds={syncingIds}
                  onSync={syncConnection}
                  onDisconnect={requestDisconnect}
                />
              ) : (
                <Button
                  className="text-sm font-medium"
                  variant="ghost"
                  onPress={() => setIsManagementSheetOpen(true)}
                >
                  Connect a calendar to see your events
                </Button>
              )}
            </View>
          </View>
        </ScrollView>
      </ScrollShadow>

      <ConnectCalendarSheet
        isOpen={isManagementSheetOpen}
        onClose={() => setIsManagementSheetOpen(false)}
      />

      <DisconnectCalendarDialog
        isOpen={pendingId !== null}
        isDisconnecting={isDisconnecting}
        error={disconnectError}
        onConfirm={confirmDisconnect}
        onCancel={cancelDisconnect}
      />
    </View>
  );
}
