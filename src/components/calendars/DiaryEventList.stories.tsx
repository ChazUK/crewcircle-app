import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { DiaryEventListContent, type DiaryEvent } from "./DiaryEventList";

const now = Date.now();
const todayNoon = new Date();
todayNoon.setHours(12, 0, 0, 0);
const todayNoonMs = todayNoon.getTime();

const allDayEvent: DiaryEvent = {
  _id: "evt_allday_1",
  title: "Company Away Day",
  startsAt: todayNoonMs,
  endsAt: todayNoonMs + 86_400_000,
  isAllDay: true,
  color: "#6366f1",
  provider: "google",
  connectionLabel: "jordan@gmail.com",
};

const morningEvent: DiaryEvent = {
  _id: "evt_timed_1",
  title: "Kit service — Panavision",
  startsAt: todayNoonMs - 1 * 3600_000, // 11:00
  endsAt: todayNoonMs + 30 * 60_000, // 12:30
  isAllDay: false,
  color: "#3b82f6",
  provider: "google",
  connectionLabel: "jordan@gmail.com",
  location: "Greenford",
};

const afternoonEvent: DiaryEvent = {
  _id: "evt_timed_2",
  title: "Director's Prep Meeting",
  startsAt: todayNoonMs + 2 * 3600_000, // 14:00
  endsAt: todayNoonMs + 3 * 3600_000, // 15:00
  isAllDay: false,
  color: "#f59e0b",
  provider: "microsoft",
  connectionLabel: "jordan@studio.com",
  location: "Soho — Edit Suite 3",
};

const eveningEvent: DiaryEvent = {
  _id: "evt_timed_3",
  title: "Wrap Party",
  startsAt: todayNoonMs + 6 * 3600_000, // 18:00
  endsAt: todayNoonMs + 9 * 3600_000, // 21:00
  isAllDay: false,
  color: "#ef4444",
  provider: "ical",
  connectionLabel: "Crew Social",
};

const decorator = (Story: React.ComponentType) => (
  <View style={{ flex: 1, padding: 16, backgroundColor: "#ffffff" }}>
    <Story />
  </View>
);

const meta = {
  title: "Calendars/DiaryEventList",
  component: DiaryEventListContent,
  decorators: [decorator],
  tags: ["autodocs"],
} satisfies Meta<typeof DiaryEventListContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    events: undefined,
  },
};

export const NoEvents: Story = {
  args: {
    events: [],
  },
};

export const AllDayOnly: Story = {
  args: {
    events: [allDayEvent],
  },
};

export const TimedOnly: Story = {
  args: {
    events: [morningEvent, afternoonEvent],
  },
};

export const Mixed: Story = {
  args: {
    events: [allDayEvent, morningEvent, afternoonEvent, eveningEvent],
  },
};

export const SingleTimedEvent: Story = {
  args: {
    events: [morningEvent],
  },
};

export const MultipleAllDay: Story = {
  args: {
    events: [
      allDayEvent,
      {
        _id: "evt_allday_2",
        title: "Bank Holiday",
        startsAt: now,
        endsAt: now + 86_400_000,
        isAllDay: true,
        color: "#8b5cf6",
        provider: "ical",
        connectionLabel: "UK Holidays",
      },
    ],
  },
};
