import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { Spinner } from "heroui-native";
import { ClockIcon, PinIcon } from "lucide-react-native";
import { Text, View } from "react-native";

export type DiaryEvent = {
  _id: string;
  title: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  color: string;
  provider: string;
  connectionLabel: string;
  location?: string;
};

type ContentProps = {
  events: DiaryEvent[] | undefined;
};

function formatTimeRange(startsAt: number, endsAt: number) {
  return `${format(new Date(startsAt), "H:mm")}–${format(new Date(endsAt), "H:mm")}`;
}

function DiaryEventRow({ event }: { event: DiaryEvent }) {
  const heading = `${event.provider} — ${event.connectionLabel}`.toUpperCase();

  return (
    <View className="flex-row overflow-hidden rounded-xl bg-surface">
      <View style={{ width: 4, backgroundColor: event.color }} />
      <View className="flex-1 px-4 py-3">
        <Text
          numberOfLines={1}
          style={{ color: event.color }}
          className="text-xs font-semibold tracking-wider"
        >
          {heading}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-base font-semibold text-foreground">
          {event.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <ClockIcon color="#9ca3af" />
            <Text className="text-xs text-muted">
              {event.isAllDay ? "All day" : formatTimeRange(event.startsAt, event.endsAt)}
            </Text>
          </View>
          {event.location ? (
            <View className="flex-1 flex-row items-center gap-1.5">
              <PinIcon size={14} color="#9ca3af" />
              <Text numberOfLines={1} className="flex-1 text-xs text-muted">
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function DiaryEventListContent({ events }: ContentProps) {
  if (events === undefined) {
    return (
      <View className="items-center py-8">
        <Spinner />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-sm text-muted">No events</Text>
      </View>
    );
  }

  return (
    <View className="gap-2 px-4">
      {events.map((event) => (
        <DiaryEventRow key={event._id} event={event} />
      ))}
    </View>
  );
}

type Props = {
  selectedDate: string;
};

export function DiaryEventList({ selectedDate }: Props) {
  const dayStart = startOfDay(parseISO(selectedDate));
  const startMs = dayStart.getTime();
  const endMs = addDays(dayStart, 1).getTime();

  const events = useQuery(api.calendars.queries.getEventsForDate, { startMs, endMs });

  return <DiaryEventListContent events={events} />;
}
