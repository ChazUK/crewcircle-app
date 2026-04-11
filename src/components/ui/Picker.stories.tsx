import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { COUNTRIES } from "@/data/countries";

import { Picker } from "./Picker";

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

const FRUIT_OPTIONS = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "grape", label: "Grape" },
  { value: "mango", label: "Mango" },
  { value: "orange", label: "Orange" },
  { value: "peach", label: "Peach" },
  { value: "pear", label: "Pear" },
  { value: "pineapple", label: "Pineapple" },
  { value: "strawberry", label: "Strawberry" },
];

const DEPARTMENT_OPTIONS = [
  { value: "camera", label: "Camera" },
  { value: "sound", label: "Sound" },
  { value: "lighting", label: "Lighting" },
  { value: "art", label: "Art Department" },
  { value: "costume", label: "Costume" },
  { value: "makeup", label: "Makeup & Hair" },
  { value: "production", label: "Production" },
];

const meta = {
  title: "UI/Picker",
  component: Picker,
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
    value: null,
    onChange: () => {},
    options: FRUIT_OPTIONS,
    placeholder: "Select an option",
  },
} satisfies Meta<typeof Picker>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState<string | null>(args.value ?? null);
  return <Picker {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: InteractiveRender,
};

export const WithLabel: Story = {
  args: {
    label: "Favourite Fruit",
  },
  render: InteractiveRender,
};

export const WithListLabel: Story = {
  args: {
    label: "Favourite Fruit",
    listLabel: "Choose a fruit",
  },
  render: InteractiveRender,
};

export const WithPreselectedValue: Story = {
  args: {
    label: "Favourite Fruit",
    value: "mango",
  },
  render: InteractiveRender,
};

export const Department: Story = {
  args: {
    label: "Department",
    placeholder: "Select a department",
    listLabel: "Choose your department",
    options: DEPARTMENT_OPTIONS,
  },
  render: InteractiveRender,
};

export const LongList: Story = {
  args: {
    label: "Country",
    placeholder: "Select a country",
    listLabel: "All countries",
    options: COUNTRY_OPTIONS,
    snapPoints: ["75%"],
  },
  render: InteractiveRender,
};
