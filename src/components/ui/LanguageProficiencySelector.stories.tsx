import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { type LanguageEntry, LanguageProficiencySelector } from "./LanguageProficiencySelector";

const meta = {
  title: "UI/LanguageProficiencySelector",
  component: LanguageProficiencySelector,
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
    value: [],
    onChange: () => {},
  },
} satisfies Meta<typeof LanguageProficiencySelector>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState<LanguageEntry[]>(args.value);

  useEffect(() => {
    setValue(args.value);
  }, [args.value]);

  return <LanguageProficiencySelector {...args} value={value} onChange={setValue} />;
};

export const Empty: Story = {
  render: InteractiveRender,
};

export const SingleEntry: Story = {
  args: {
    value: [{ language: "English", proficiency: "C2" }],
  },
  render: InteractiveRender,
};

export const MultipleEntries: Story = {
  args: {
    value: [
      { language: "English", proficiency: "C2" },
      { language: "French", proficiency: "B1" },
      { language: "Spanish", proficiency: "A2" },
    ],
  },
  render: InteractiveRender,
};

export const AllCEFRLevels: Story = {
  args: {
    value: [
      { language: "English", proficiency: "C2" },
      { language: "French", proficiency: "C1" },
      { language: "German", proficiency: "B2" },
      { language: "Spanish", proficiency: "B1" },
      { language: "Italian", proficiency: "A2" },
      { language: "Japanese", proficiency: "A1" },
    ],
  },
  render: InteractiveRender,
};

export const EmptyLanguageName: Story = {
  args: {
    value: [{ language: "", proficiency: "B1" }],
  },
  render: InteractiveRender,
};
