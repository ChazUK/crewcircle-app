import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "heroui-native";
import { View } from "react-native";

import { GoogleIcon } from "../ui/icons/Google";

// SignInWithGoogleButton uses Clerk hooks (useSignInWithGoogle, useRouter) which require
// a ClerkProvider in the host app. These stories render a visual stand-in so reviewers
// can inspect the button appearance without running the full auth flow.

function GoogleButtonVisual() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Button variant="outline" className="w-full" onPress={() => {}}>
        <GoogleIcon size={24} />
        <Button.Label>Sign in with Google</Button.Label>
      </Button>
    </View>
  );
}

const meta = {
  title: "Auth/SignInWithGoogleButton",
  component: GoogleButtonVisual,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof GoogleButtonVisual>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
