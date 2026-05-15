import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { InputOTP } from "./InputOTP";

const meta = {
  title: "Form/InputOTP",
  component: InputOTP,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof InputOTP>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
