import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CountryPicker } from "./CountryPicker";

const meta = {
  title: "UI/CountryPicker",
  component: CountryPicker,
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
    placeholder: "Select a country",
  },
} satisfies Meta<typeof CountryPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState<string | null>(args.value ?? null);
  return <CountryPicker {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: InteractiveRender,
};

export const WithLabel: Story = {
  args: {
    label: "Country",
  },
  render: InteractiveRender,
};

export const WithPlaceholder: Story = {
  args: {
    label: "Home country",
    placeholder: "Choose your country…",
  },
  render: InteractiveRender,
};

export const Selected: Story = {
  args: {
    label: "Country",
    value: "GB",
  },
  render: InteractiveRender,
};

export const SelectedUS: Story = {
  args: {
    label: "Country",
    value: "US",
  },
  render: InteractiveRender,
};

export const SelectedAU: Story = {
  args: {
    label: "Country",
    value: "AU",
  },
  render: InteractiveRender,
};
