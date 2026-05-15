import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { SignInWithAppleButton } from "./SignInWithAppleButton";

const meta = {
  title: "Auth/SignInWithAppleButton",
  component: SignInWithAppleButton,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: () => {},
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SignInWithAppleButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
