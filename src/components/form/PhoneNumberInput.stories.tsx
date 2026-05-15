import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PhoneNumberInput } from "./PhoneNumberInput";

const meta = {
  title: "Form/PhoneNumberInput",
  component: PhoneNumberInput,
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, padding: 16 }}>
            <Story />
          </View>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    ),
  ],
  tags: ["autodocs"],
  args: {
    value: null,
    onChange: () => {},
  },
} satisfies Meta<typeof PhoneNumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState<string | null>(args.value);
  return (
    <View className="gap-3">
      <PhoneNumberInput {...args} value={value} onChange={setValue} />
      <Text>{value ?? "(empty)"}</Text>
    </View>
  );
};

export const Default: Story = {
  render: InteractiveRender,
};

export const PrefilledGB: Story = {
  render: InteractiveRender,
  args: {
    value: "+447700900123",
  },
};

export const Invalid: Story = {
  render: InteractiveRender,
  args: {
    isInvalid: true,
  },
};
