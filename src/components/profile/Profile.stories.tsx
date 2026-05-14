import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";

import { Profile } from "./Profile";

const baseCrew = {
  userId: "user_1" as Id<"users">,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: undefined,
  userType: "crew" as const,
  department: undefined,
  roles: undefined,
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
  title: "Profile/Profile",
  component: Profile,
  tags: ["autodocs"],
  args: { profile: selfWithNicknameProfile },
} satisfies Meta<typeof Profile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithNickname: Story = { args: { profile: selfWithNicknameProfile } };
export const SelfWithoutNickname: Story = { args: { profile: selfWithoutNicknameProfile } };
export const Contact: Story = { args: { profile: contactProfile } };
export const PublicCard: Story = { args: { profile: publicCardProfile } };
export const PMSelf: Story = { args: { profile: pmSelfProfile } };
