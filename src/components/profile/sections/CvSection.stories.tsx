import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { CvSection } from "./CvSection";

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
  city: undefined,
  country: undefined,
};

const selfWithCv: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  bio: undefined,
  cvUrl: "https://storage.example.com/cv.pdf",
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  passports: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  bio: undefined,
  cvUrl: undefined,
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  passports: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const contactWithCv: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  bio: undefined,
  cvUrl: "https://storage.example.com/cv.pdf",
  startYearInDepartment: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  passports: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const meta = {
  title: "Profile/CvSection",
  component: CvSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithCv },
} satisfies Meta<typeof CvSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithCv: Story = { args: { profile: selfWithCv } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithCv: Story = { args: { profile: contactWithCv } };
