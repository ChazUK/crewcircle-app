import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { BottomSheetSearch } from "./BottomSheetSearch";

const meta = {
  title: "Form/BottomSheetSearch",
  component: BottomSheetSearch,
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
            <Story />
          </View>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    ),
  ],
  tags: ["autodocs"],
  args: {
    value: "",
    onChange: (_next: string) => {},
    placeholder: "Search...",
  },
} satisfies Meta<typeof BottomSheetSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [value, setValue] = useState(args.value);

  useEffect(() => {
    sheetRef.current?.present();
  }, []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["50%", "90%"]}
      keyboardBehavior="extend"
      enableDynamicSizing={false}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 16 }}>
        <BottomSheetSearch
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange(next);
          }}
        />
        <View style={{ marginTop: 16 }}>
          <Text>Current value: {value || "(empty)"}</Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export const Default: Story = {
  render: InteractiveRender,
};

export const WithInitialValue: Story = {
  render: InteractiveRender,
  args: {
    value: "Banana",
  },
};

export const CustomPlaceholder: Story = {
  render: InteractiveRender,
  args: {
    placeholder: "Search countries...",
  },
};
