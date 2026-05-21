import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { MembershipsSection } from "./MembershipsSection";

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

const extras = {
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

const selfWithData: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  ...extras,
  memberships: [
    { id: "m1", name: "BECTU", memberNumber: "123456" },
    { id: "m2", name: "BSC", memberNumber: undefined },
    { id: "m3", name: "GBCT", memberNumber: "GB-789" },
  ],
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  ...extras,
  memberships: undefined,
};

const contactWithData: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  ...extras,
  memberships: [
    { id: "m1", name: "BAFTA", memberNumber: "BA-001" },
    { id: "m2", name: "BECTU", memberNumber: undefined },
  ],
};

const meta = {
  title: "Profile/MembershipsSection",
  component: MembershipsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithData },
} satisfies Meta<typeof MembershipsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithData: Story = { args: { profile: selfWithData } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithData: Story = { args: { profile: contactWithData } };
