import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { DrivingLicencesSection } from "./DrivingLicencesSection";

const baseCrew = {
  userId: "user_1" as Id<"users">,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: undefined,
  userType: "crew" as const,
  nickname: undefined,
  department: "Camera" as const,
  roles: ["Director of Photography"],
  city: undefined,
  country: undefined,
};

const selfWithData: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  passports: undefined,
  drivingLicences: ["Car (B)", "Motorcycle (A)", "HGV/LGV (C)"],
  workEligibility: undefined,
  kit: undefined,
  certifications: undefined,
  memberships: undefined,
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
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
  kit: undefined,
  certifications: undefined,
  memberships: undefined,
};

const contactWithData: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  passports: undefined,
  drivingLicences: ["Car (B)", "Forklift"],
  workEligibility: undefined,
  kit: undefined,
  certifications: undefined,
  memberships: undefined,
};

const meta = {
  title: "Profile/DrivingLicencesSection",
  component: DrivingLicencesSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithData },
} satisfies Meta<typeof DrivingLicencesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithData: Story = { args: { profile: selfWithData } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithData: Story = { args: { profile: contactWithData } };
