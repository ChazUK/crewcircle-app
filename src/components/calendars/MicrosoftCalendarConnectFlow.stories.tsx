import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { MicrosoftCalendarConnectFlow } from "./MicrosoftCalendarConnectFlow";

const meta = {
  title: "Calendars/MicrosoftCalendarConnectFlow",
  component: MicrosoftCalendarConnectFlow,
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
    onBack: () => {},
  },
} satisfies Meta<typeof MicrosoftCalendarConnectFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
