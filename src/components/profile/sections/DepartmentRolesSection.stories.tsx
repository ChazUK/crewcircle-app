import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { DepartmentRolesSection } from "./DepartmentRolesSection";

const baseCrew = {
  userId: "user_1" as Id<"users">,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: undefined,
  userType: "crew" as const,
  nickname: undefined,
  city: undefined,
  country: undefined,
};

const selfWithData: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  department: "Camera",
  roles: ["Director of Photography", "1st AC"],
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
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  department: undefined,
  roles: undefined,
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
};

const contact: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  department: "Sound",
  roles: ["Production Sound Mixer", "Sound Assistant"],
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
};

const publicCard: ViewableProfile = {
  mode: "public-card",
  ...baseCrew,
  department: "Electrical",
  roles: ["Gaffer"],
};

const meta = {
  title: "Profile/DepartmentRolesSection",
  component: DepartmentRolesSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithData },
} satisfies Meta<typeof DepartmentRolesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithData: Story = { args: { profile: selfWithData } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const Contact: Story = { args: { profile: contact } };
export const PublicCard: Story = { args: { profile: publicCard } };
