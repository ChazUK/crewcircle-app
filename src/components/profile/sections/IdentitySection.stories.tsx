import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { IdentitySection } from "./IdentitySection";

const meta = {
  title: "Profile/IdentitySection",
  component: IdentitySection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof IdentitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    profile: {
      firstName: "Ada",
      lastName: "Lovelace",
    },
  },
};

export const WithNickname: Story = {
  args: {
    profile: {
      firstName: "Ada",
      lastName: "Lovelace",
      nickname: "Ace",
    },
  },
};

export const WithPicture: Story = {
  args: {
    profile: {
      firstName: "Ada",
      lastName: "Lovelace",
      profilePictureUrl: "https://i.pravatar.cc/300?u=ada",
    },
  },
};
