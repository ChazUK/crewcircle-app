import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Select } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { BottomSheetSelect, SelectOption } from "./BottomSheetSelect";

type FruitOption = SelectOption & { emoji: string; color: string };

const FRUIT_VARIETIES = [
  "Red",
  "Green",
  "Yellow",
  "Sweet",
  "Sour",
  "Wild",
  "Fresh",
  "Dried",
  "Frozen",
  "Organic",
  "Heirloom",
  "Tropical",
];

const FRUITS: FruitOption[] = [
  { value: "apple", label: "Apple", emoji: "🍎", color: "#e63946" },
  { value: "banana", label: "Banana", emoji: "🍌", color: "#f1c40f" },
  { value: "cherry", label: "Cherry", emoji: "🍒", color: "#c0392b" },
  { value: "grape", label: "Grape", emoji: "🍇", color: "#8e44ad" },
  { value: "kiwi", label: "Kiwi", emoji: "🥝", color: "#7cb342" },
  { value: "lemon", label: "Lemon", emoji: "🍋", color: "#fff176" },
  { value: "mango", label: "Mango", emoji: "🥭", color: "#f39c12" },
  { value: "orange", label: "Orange", emoji: "🍊", color: "#e67e22" },
  { value: "peach", label: "Peach", emoji: "🍑", color: "#ffab91" },
  { value: "pear", label: "Pear", emoji: "🍐", color: "#aed581" },
  { value: "pineapple", label: "Pineapple", emoji: "🍍", color: "#fbc02d" },
  { value: "strawberry", label: "Strawberry", emoji: "🍓", color: "#e91e63" },
  { value: "watermelon", label: "Watermelon", emoji: "🍉", color: "#ef5350" },
];

const LONG_FRUITS: FruitOption[] = FRUIT_VARIETIES.flatMap((variety) =>
  FRUITS.map((fruit) => ({
    ...fruit,
    value: `${variety.toLowerCase()}-${fruit.value}`,
    label: `${variety} ${fruit.label}`,
  })),
);

const meta = {
  title: "Form/BottomSheetSelect",
  component: BottomSheetSelect<FruitOption>,
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
    options: FRUITS,
    onChange: () => {},
  },
} satisfies Meta<typeof BottomSheetSelect<FruitOption>>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [selected, setSelected] = useState<string | undefined>(args.value);
  return (
    <BottomSheetSelect
      {...args}
      value={selected}
      onChange={(next) => {
        setSelected(next);
        args.onChange?.(next);
      }}
    />
  );
};

export const Default: Story = {
  render: InteractiveRender,
};

export const CustomTrigger: Story = {
  render: InteractiveRender,
  args: {
    value: "mango",
    renderTriggerValue: (selected) => (
      <>
        {selected ? (
          <View className="flex-row items-center gap-2 flex-1">
            <Text className="text-base">{selected.emoji}</Text>
            <Text className="text-base">{selected.label}</Text>
          </View>
        ) : (
          <View className="flex-1">
            <Text className="text-gray-500 text-base">Pick your favourite fruit…</Text>
          </View>
        )}
        <Select.TriggerIndicator />
      </>
    ),
  },
};

export const CustomOptionContent: Story = {
  render: InteractiveRender,
  args: {
    renderOptionContent: (option) => (
      <>
        <View className="flex-row items-center gap-3 flex-1">
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: option.color,
            }}
          />
          <Select.ItemLabel />
          <Text className="text-base">{option.emoji}</Text>
        </View>
        <Select.ItemIndicator />
      </>
    ),
  },
};

export const Preselected: Story = {
  render: InteractiveRender,
  args: {
    value: "kiwi",
  },
};

export const Disabled: Story = {
  args: {
    value: "apple",
    disabled: true,
  },
};

export const CustomPlaceholder: Story = {
  render: InteractiveRender,
  args: {
    placeholder: "What are you craving?",
  },
};

export const Searchable: Story = {
  render: InteractiveRender,
  args: {
    searchable: true,
    searchPlaceholder: "Search fruits...",
  },
};

export const SearchableLongList: Story = {
  render: InteractiveRender,
  args: {
    options: LONG_FRUITS,
    searchable: true,
    searchPlaceholder: `Search ${LONG_FRUITS.length} fruits...`,
  },
};

export const SearchableWithCustomContent: Story = {
  render: InteractiveRender,
  args: {
    searchable: true,
    searchPlaceholder: "Search fruits...",
    renderOptionContent: (option) => (
      <>
        <View className="flex-row items-center gap-3 flex-1">
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: option.color,
            }}
          />
          <Select.ItemLabel />
          <Text className="text-base">{option.emoji}</Text>
        </View>
        <Select.ItemIndicator />
      </>
    ),
  },
};
