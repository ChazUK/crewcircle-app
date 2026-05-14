import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { IdentitySection } from "./IdentitySection";

const baseCrew = {
  userId: "user_1" as Id<"users">,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: undefined,
  userType: "crew" as const,
};

const basePm = {
  userId: "user_2" as Id<"users">,
  firstName: "Grace",
  lastName: "Hopper",
  profilePictureUrl: undefined,
  userType: "production-manager" as const,
};

const selfWithNicknameProfile: ViewableProfile = {
  mode: "self",
  ...baseCrew,
  nickname: "Ace",
};

const selfWithoutNicknameProfile: ViewableProfile = {
  mode: "self",
  ...baseCrew,
  nickname: undefined,
};

const contactProfile: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  nickname: "Ace",
};

const publicCardProfile: ViewableProfile = {
  mode: "public-card",
  ...baseCrew,
  nickname: undefined,
};

const pmSelfProfile: ViewableProfile = {
  mode: "pm-self",
  ...basePm,
  nickname: undefined,
};

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
  args: { profile: selfWithNicknameProfile },
} satisfies Meta<typeof IdentitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithNickname: Story = {
  args: { profile: selfWithNicknameProfile, onEditIdentity: () => {} },
};

export const SelfWithoutNickname: Story = {
  args: { profile: selfWithoutNicknameProfile, onEditIdentity: () => {} },
};

export const Contact: Story = {
  args: { profile: contactProfile },
};

export const PublicCard: Story = {
  args: { profile: publicCardProfile },
};

export const PMSelf: Story = {
  args: { profile: pmSelfProfile, onEditIdentity: () => {} },
};
