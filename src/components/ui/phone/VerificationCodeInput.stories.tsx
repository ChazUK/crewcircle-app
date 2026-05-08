import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { VerificationCodeInput } from "./VerificationCodeInput";

const meta = {
  title: "UI/Phone/VerificationCodeInput",
  component: VerificationCodeInput,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Story />
      </View>
    ),
  ],
  args: {
    value: "",
    onChange: () => {},
    autoFocus: false,
    disabled: false,
  },
} satisfies Meta<typeof VerificationCodeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartiallyFilled: Story = {
  args: {
    value: "123",
  },
};

export const Filled: Story = {
  args: {
    value: "123456",
  },
};

export const Disabled: Story = {
  args: {
    value: "123456",
    disabled: true,
  },
};

export const WithOnComplete: Story = {
  args: {
    value: "",
    onComplete: (code) => {
      console.log("Code complete:", code);
    },
  },
};
