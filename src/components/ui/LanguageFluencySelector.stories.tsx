import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { type LanguageEntry, LanguageFluencySelector } from "./LanguageFluencySelector";

const meta = {
  title: "UI/LanguageFluencySelector",
  component: LanguageFluencySelector,
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
} satisfies Meta<typeof LanguageFluencySelector>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState<LanguageEntry[]>(args.value);

  useEffect(() => {
    setValue(args.value);
  }, [args.value]);

  return <LanguageFluencySelector {...args} value={value} onChange={setValue} />;
};

export const Empty: Story = {
  render: InteractiveRender,
};

export const SingleEntry: Story = {
  args: {
    value: [{ language: "English", fluency: "Native" }],
  },
  render: InteractiveRender,
};

export const MultipleEntries: Story = {
  args: {
    value: [
      { language: "English", fluency: "Native" },
      { language: "French", fluency: "Conversational" },
      { language: "Spanish", fluency: "Basic" },
    ],
  },
  render: InteractiveRender,
};

export const AllFluencyLevels: Story = {
  args: {
    value: [
      { language: "English", fluency: "Native" },
      { language: "French", fluency: "Fluent" },
      { language: "German", fluency: "Conversational" },
      { language: "Italian", fluency: "Basic" },
    ],
  },
  render: InteractiveRender,
};

export const EmptyLanguageName: Story = {
  args: {
    value: [{ language: "", fluency: "Fluent" }],
  },
  render: InteractiveRender,
};
