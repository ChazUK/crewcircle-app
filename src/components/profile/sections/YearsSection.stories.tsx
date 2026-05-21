import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { YearsSection } from "./YearsSection";

const baseCrew = {
  userId: "user_1" as Id<"users">,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: undefined,
  userType: "crew" as const,
  nickname: undefined,
  department: "Camera" as const,
  roles: ["Director of Photography"],
  bio: undefined,
  website: undefined,
  imdbId: undefined,
  cvUrl: undefined,
  city: undefined,
  country: undefined,
  productionTypes: undefined,
  spokenLanguages: undefined,
  drivingLicences: undefined,
  workEligibility: undefined,
};

const selfWithStartYear: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  startYearInDepartment: 2015,
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  startYearInDepartment: undefined,
};

const contactWithStartYear: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  startYearInDepartment: 2020,
};

const meta = {
  title: "Profile/YearsSection",
  component: YearsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithStartYear },
} satisfies Meta<typeof YearsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithStartYear: Story = { args: { profile: selfWithStartYear } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithStartYear: Story = { args: { profile: contactWithStartYear } };
