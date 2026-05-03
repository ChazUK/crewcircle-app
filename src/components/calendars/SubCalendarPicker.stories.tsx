import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SubCalendarList, type SubCalendarListProps } from "./SubCalendarPicker";

const mockSubCalendars = [
  { id: "primary", label: "Work Calendar", primary: true },
  { id: "holidays", label: "UK Holidays", primary: false, hint: "Public holidays" },
  { id: "birthdays", label: "Contacts' Birthdays", primary: false },
];

const meta = {
  title: "Calendars/SubCalendarList",
  component: SubCalendarList,
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
            <Story />
          </View>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    ),
  ],
  tags: ["autodocs"],
  args: {
    subCalendars: mockSubCalendars,
    provider: "google" as const,
    connectionColor: "#6366f1",
    onConfirm: () => {},
    onBack: () => {},
  } satisfies SubCalendarListProps,
} satisfies Meta<typeof SubCalendarList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    subCalendars: undefined,
  },
};

export const Empty: Story = {
  args: {
    subCalendars: [],
  },
};

export const GooglePrimaryPreselected: Story = {
  args: {
    provider: "google",
    subCalendars: mockSubCalendars,
  },
};

export const MicrosoftPrimaryPreselected: Story = {
  args: {
    provider: "microsoft",
    subCalendars: [
      { id: "primary", label: "Personal Calendar", primary: true },
      { id: "ms_holidays", label: "UK Holidays", primary: false },
    ],
    connectionColor: "#0078d4",
  },
};

export const NativeAllPreselected: Story = {
  args: {
    provider: "native",
    subCalendars: [
      { id: "cal_personal", label: "Personal", primary: false },
      { id: "cal_work", label: "Work", primary: false },
      { id: "cal_family", label: "Family", primary: false },
    ],
    connectionColor: "#f59e0b",
  },
};

export const ICalAllPreselected: Story = {
  args: {
    provider: "ical",
    subCalendars: [{ id: "default", label: "My iCal Feed", primary: false }],
    connectionColor: "#22c55e",
  },
};

export const WithHints: Story = {
  args: {
    subCalendars: [
      { id: "primary", label: "Primary", primary: true, hint: "Main work calendar" },
      { id: "team", label: "Team Events", primary: false, hint: "Shared with the whole team" },
    ],
  },
};

export const SingleCalendar: Story = {
  args: {
    subCalendars: [{ id: "primary", label: "Primary Calendar", primary: true }],
  },
};

export const NoPrimaryFallsBackToAll: Story = {
  args: {
    provider: "google",
    subCalendars: [
      { id: "work", label: "Work", primary: false },
      { id: "personal", label: "Personal", primary: false },
    ],
  },
};
