import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { SignInWithGoogleButton } from "./SignInWithGoogleButton";

const meta = {
  title: "Auth/SignInWithGoogleButton",
  component: SignInWithGoogleButton,
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
} satisfies Meta<typeof SignInWithGoogleButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
