import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";

import { Search } from "./Search";

const meta = {
  title: "Form/Search",
  component: Search,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    value: "",
    onChange: () => {},
    placeholder: "Search...",
  },
} satisfies Meta<typeof Search>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [value, setValue] = useState(args.value);
  return (
    <Search
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
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
