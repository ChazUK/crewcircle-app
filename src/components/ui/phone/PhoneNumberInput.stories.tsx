import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PhoneNumberInput } from "./PhoneNumberInput";

const meta = {
  title: "UI/Phone/PhoneNumberInput",
  component: PhoneNumberInput,
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
    value: { country: "GB", national: "" },
    onChange: () => {},
    disabled: false,
  },
} satisfies Meta<typeof PhoneNumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [state, setState] = useState(args.value);
  return <PhoneNumberInput {...args} value={state} onChange={(next) => setState(next)} />;
};

export const Default: Story = {
  render: InteractiveRender,
};

export const UnitedStates: Story = {
  render: InteractiveRender,
  args: {
    value: { country: "US", national: "" },
  },
};

export const WithNationalNumber: Story = {
  render: InteractiveRender,
  args: {
    value: { country: "GB", national: "7700900123" },
  },
};

export const WithValidNumber: Story = {
  args: {
    value: { country: "GB", national: "07700900123" },
  },
};

export const WithError: Story = {
  args: {
    value: { country: "GB", national: "123" },
    error: "Please enter a valid phone number",
  },
};

export const Disabled: Story = {
  args: {
    value: { country: "GB", national: "07700900123" },
    disabled: true,
  },
};

export const EmptyCountry: Story = {
  render: InteractiveRender,
  args: {
    value: { country: "", national: "" },
  },
};
