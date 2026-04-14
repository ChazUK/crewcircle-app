import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CountrySelect } from "./CountrySelect";

const meta = {
  title: "UI/CountrySelect",
  component: CountrySelect,
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
    onOpenChange: () => {},
    onValueChange: () => {},
  },
} satisfies Meta<typeof CountrySelect>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [selectedValue, setSelectedValue] = useState<
    { value: string; label: string } | undefined
  >();

  const handleValueChange = (value: { value: string; label: string } | undefined) => {
    console.log("Country selected:", value);
    setSelectedValue(value);
  };

  return <CountrySelect {...args} onValueChange={handleValueChange} />;
};

export const Default: Story = {
  render: InteractiveRender,
};
