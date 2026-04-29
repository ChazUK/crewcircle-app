import type { Meta, StoryObj } from "@storybook/react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { View } from "react-native";

// SignInWithAppleButton uses Clerk hooks (useSignInWithApple, useRouter) which require
// a ClerkProvider in the host app. These stories render the Apple authentication button
// in isolation so reviewers can inspect its appearance without running the full auth flow.

function AppleButtonVisual() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={22}
        style={{ height: 44, width: "100%" }}
        onPress={() => {}}
      />
    </View>
  );
}

const meta = {
  title: "Auth/SignInWithAppleButton",
  component: AppleButtonVisual,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof AppleButtonVisual>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
