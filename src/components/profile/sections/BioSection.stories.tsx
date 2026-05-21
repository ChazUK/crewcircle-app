import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { BioSection } from "./BioSection";

const baseCrew = {
  userId: "user_1" as Id<"users">,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: undefined,
  userType: "crew" as const,
  nickname: undefined,
  department: "Camera" as const,
  roles: ["Director of Photography"],
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  city: undefined,
  country: undefined,
};

const selfWithBio: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  bio: "Camera operator with 15 years experience in film and television.",
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  bio: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const contactWithBio: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  bio: "Camera operator with 15 years experience in film and television.",
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const meta = {
  title: "Profile/BioSection",
  component: BioSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithBio },
} satisfies Meta<typeof BioSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithBio: Story = { args: { profile: selfWithBio } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithBio: Story = { args: { profile: contactWithBio } };
