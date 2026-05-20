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
  department: undefined,
  roles: undefined,
  city: undefined,
  country: undefined,
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
  isPublic: false,
  ...baseCrew,
  nickname: "Ace",
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
};

const selfWithoutNicknameProfile: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  nickname: undefined,
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
};

const selfWithPictureProfile: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  profilePictureUrl: "https://i.pravatar.cc/300?u=ada",
  nickname: undefined,
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
};

const contactProfile: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  nickname: "Ace",
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
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

const noop = () => {};

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
  args: { profile: selfWithNicknameProfile, onPicturePress: noop },
} satisfies Meta<typeof IdentitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithNickname: Story = {
  args: { profile: selfWithNicknameProfile, onPicturePress: noop },
};
export const SelfWithoutNickname: Story = {
  args: { profile: selfWithoutNicknameProfile, onPicturePress: noop },
};
export const SelfWithPicture: Story = {
  args: { profile: selfWithPictureProfile, onPicturePress: noop },
};
export const Contact: Story = { args: { profile: contactProfile } };
export const PublicCard: Story = { args: { profile: publicCardProfile } };
export const PMSelf: Story = {
  args: { profile: pmSelfProfile, onPicturePress: noop },
};
