import type { Meta, StoryObj } from "@storybook/react-native";
import { startOfMonth } from "date-fns";
import { useState } from "react";
import { View } from "react-native";

import { DiaryCalendarHeader } from "./DiaryCalendarHeader";

type XDateLike = {
  getFullYear: () => number;
  getMonth: () => number;
  getTime: () => number;
};

function makeXDate(year: number, month: number): XDateLike {
  const date = startOfMonth(new Date(year, month));
  return {
    getFullYear: () => date.getFullYear(),
    getMonth: () => date.getMonth(),
    getTime: () => date.getTime(),
  };
}

type Args = React.ComponentProps<typeof DiaryCalendarHeader>;

function HeaderStoryHarness(args: Args) {
  const initialYear = args.month?.getFullYear() ?? new Date().getFullYear();
  const initialMonth = args.month?.getMonth() ?? new Date().getMonth();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const addMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <View className="bg-background">
      <DiaryCalendarHeader month={makeXDate(year, month + 1)} addMonth={addMonth} />
    </View>
  );
}

const meta = {
  title: "Calendars/DiaryCalendarHeader",
  component: DiaryCalendarHeader,
  tags: ["autodocs"],
  args: {
    month: makeXDate(new Date().getFullYear(), new Date().getMonth() + 1),
    addMonth: () => {},
  },
  render: (args) => <HeaderStoryHarness {...args} />,
} satisfies Meta<typeof DiaryCalendarHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CurrentMonth: Story = {};

export const PastMonth: Story = {
  args: {
    month: makeXDate(2024, 1),
  },
};

export const FutureMonth: Story = {
  args: {
    month: makeXDate(2100, 12),
  },
};

export const Empty: Story = {
  args: {
    month: undefined,
    addMonth: undefined,
  },
  render: (args) => <DiaryCalendarHeader {...args} />,
};
