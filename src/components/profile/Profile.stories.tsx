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
  passports: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
  certifications: undefined,
  memberships: undefined,
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
  passports: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
  certifications: undefined,
  memberships: undefined,
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
  passports: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
  certifications: undefined,
  memberships: undefined,
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
