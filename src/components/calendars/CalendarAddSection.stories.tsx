import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CalendarAddSection } from "./CalendarAddSection";

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

const meta = {
  title: "Calendars/CalendarAddSection",
  component: CalendarAddSection,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    onSelectProvider: () => {},
  },
} satisfies Meta<typeof CalendarAddSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
