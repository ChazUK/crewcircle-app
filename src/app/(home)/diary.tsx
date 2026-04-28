import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarConnectionsSheet } from "@/components/ui/CalendarConnectionsSheet";
import { GearIcon } from "@/components/ui/icons/GearIcon";

const ACCENT = "#6366f1";
const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDateLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatTimeRange(startsAt: number, endsAt: number, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  const start = format(new Date(startsAt), "HH:mm");
  const end = format(new Date(endsAt), "HH:mm");
  return `${start} – ${end}`;
}

export default function Diary() {
  const todayIso = toIsoDate(Date.now());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  // The first-of-month being viewed on the calendar grid. Updated when the
  // user navigates months so we only pull events for the visible window.
  const [visibleMonth, setVisibleMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  // Query a buffer around the visible month so dots show up on the adjacent-
  // month days that react-native-calendars includes on the grid edges.
  const { startsAtMs, endsAtMs } = useMemo(() => {
    const base = parseIsoDateLocal(visibleMonth);
    const start = new Date(base.getFullYear(), base.getMonth() - 1, 1).getTime();
    const end = new Date(base.getFullYear(), base.getMonth() + 2, 1).getTime();
    return { startsAtMs: start, endsAtMs: end };
  }, [visibleMonth]);

  const events = useQuery(api.calendars.queries.listEventsInRange, {
    startsAtMs,
    endsAtMs,
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    if (!events) return map;
    for (const event of events) {
      const key = toIsoDate(event.startsAt);
      (map[key] ||= []).push(event);
    }
    return map;
  }, [events]);

  const markedDates = useMemo(() => {
    const m: Record<
      string,
      { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }
    > = {};
    for (const key of Object.keys(eventsByDate)) {
      m[key] = { marked: true, dotColor: ACCENT };
    }
    m[selectedDate] = {
      ...(m[selectedDate] ?? {}),
      selected: true,
      selectedColor: ACCENT,
    };
    return m;
  }, [eventsByDate, selectedDate]);

  const sortedSelectedDayEvents = useMemo(() => {
    const dayStart = parseIsoDateLocal(selectedDate).getTime();
    const dayEnd = dayStart + DAY_MS;
    const forDay = (events ?? []).filter(
      (event) => event.startsAt >= dayStart && event.startsAt < dayEnd,
    );
    return forDay.sort((a, b) => a.startsAt - b.startsAt);
  }, [events, selectedDate]);

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
          current={todayIso}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          onMonthChange={(m: DateData) => setVisibleMonth(m.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: "transparent",
            calendarBackground: "transparent",
            selectedDayBackgroundColor: ACCENT,
            selectedDayTextColor: "#ffffff",
            todayTextColor: ACCENT,
            dayTextColor: "#1f2937",
            textDisabledColor: "#d1d5db",
            monthTextColor: "#1f2937",
            arrowColor: ACCENT,
            textDayFontWeight: "400",
            textMonthFontWeight: "600",
            textDayHeaderFontWeight: "500",
            dotColor: ACCENT,
            selectedDotColor: "#ffffff",
          }}
          style={{ marginHorizontal: 8 }}
        />

        <View className="px-4 mt-4">
          <Text className="text-sm text-foreground/60">
            {format(parseIsoDateLocal(selectedDate), "EEEE")}
          </Text>
          <Text className="text-sm text-foreground/60">
            {format(parseIsoDateLocal(selectedDate), "d MMMM")}
          </Text>
        </View>

        <View className="px-4 mt-4 mb-8 gap-2">
          {events === undefined ? (
            <Text className="text-sm text-foreground/60">Loading events…</Text>
          ) : sortedSelectedDayEvents.length === 0 ? (
            <Text className="text-sm text-foreground/60">No events for this day.</Text>
          ) : (
            sortedSelectedDayEvents.map((event) => (
              <View
                key={event._id}
                className="rounded-xl border border-default-200 bg-default-100/50 p-3"
              >
                <Text className="text-xs font-semibold uppercase text-foreground/60">
                  {formatTimeRange(event.startsAt, event.endsAt, event.isAllDay)}
                </Text>
                <Text className="text-base font-medium text-foreground" numberOfLines={2}>
                  {event.title}
                </Text>
                {event.location ? (
                  <Text className="text-xs text-foreground/60" numberOfLines={1}>
                    {event.location}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </View>
      <CalendarConnectionsSheet isOpen={isConnectionsOpen} onOpenChange={setIsConnectionsOpen} />
    </ScrollView>
  );
}
