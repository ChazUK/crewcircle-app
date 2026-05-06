import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { CountryFlag } from "./CountryFlag";

const meta = {
  title: "UI/Icons/CountryFlag",
  component: CountryFlag,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f9f9",
        }}
      >
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    iso2: "GB",
    size: 24,
  },
} satisfies Meta<typeof CountryFlag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    iso2: "FR",
    size: 16,
  },
};

export const Large: Story = {
  args: {
    iso2: "DE",
    size: 48,
  },
};

export const LowercaseInput: Story = {
  args: {
    iso2: "es",
  },
};

export const UnknownCode: Story = {
  args: {
    iso2: "XX",
  },
};
