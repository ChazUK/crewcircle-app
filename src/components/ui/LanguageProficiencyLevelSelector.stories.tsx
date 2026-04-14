import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  type LanguageProficiencyEntry,
  LanguageProficiencyLevelSelector,
} from "./LanguageProficiencyLevelSelector";

const meta = {
  title: "UI/LanguageProficiencySelector",
  component: LanguageProficiencyLevelSelector,
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
} satisfies Meta<typeof LanguageProficiencyLevelSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState<LanguageProficiencyEntry[]>(args.value);

  const handleChange = (entries: LanguageProficiencyEntry[] | undefined) => {
    console.log({ entries });
    console.log("setting value", { entries });
    setValue(entries || []);
  };

  return <LanguageProficiencyLevelSelector {...args} value={value} onChange={handleChange} />;
};

export const Empty: Story = {
  render: InteractiveRender,
};

export const SingleSelected: Story = {
  args: {
    value: [{ language: "English", proficiency: "Native" }],
  },
  render: InteractiveRender,
};

export const MultipleSelected: Story = {
  args: {
    value: [
      { language: "English", proficiency: "Native" },
      { language: "French", proficiency: "Conversational" },
      { language: "Spanish", proficiency: "Basic" },
    ],
  },
  render: InteractiveRender,
};
