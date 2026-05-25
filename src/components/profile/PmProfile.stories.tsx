import type { Id } from "@convex/_generated/dataModel";
import type { Profile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";

import { PmProfile } from "./PmProfile";

const basePm = {
  userId: "user_1" as Id<"users">,
  firstName: "Grace",
  lastName: "Hopper",
  profilePictureUrl: undefined,
  userType: "production-manager" as const,
  nickname: undefined,
};

const pmSelfAllFields: Extract<Profile, { mode: "pm-self" }> = {
  mode: "pm-self",
  ...basePm,
  city: "London",
  country: "GB",
  productionCompany: "Acme Films",
  bio: "Award-winning production manager with 20 years in the industry.",
  website: "https://acmefilms.example.com",
};

const pmSelfMinimal: Extract<Profile, { mode: "pm-self" }> = {
  mode: "pm-self",
  ...basePm,
  city: undefined,
  country: undefined,
  productionCompany: undefined,
  bio: undefined,
  website: undefined,
};

const meta = {
  title: "Profile/PmProfile",
  component: PmProfile,
  tags: ["autodocs"],
  args: { profile: pmSelfAllFields },
} satisfies Meta<typeof PmProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PMSelfAllFields: Story = { args: { profile: pmSelfAllFields } };
export const PMSelfMinimal: Story = { args: { profile: pmSelfMinimal } };
