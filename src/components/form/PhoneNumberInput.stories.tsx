import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Phone from "./PhoneNumberInput";

const meta = {
  title: "Form/PhoneNumberInput",
  component: Phone,
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
} satisfies Meta<typeof Phone>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
