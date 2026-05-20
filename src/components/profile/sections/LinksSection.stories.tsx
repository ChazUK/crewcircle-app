import type { Id } from "@convex/_generated/dataModel";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { LinksSection } from "./LinksSection";

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
  cvUrl: undefined,
  city: undefined,
  country: undefined,
};

const meta = {
  title: "Profile/LinksSection",
  component: LinksSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof LinksSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    profile: {
      mode: "self",
      ...baseCrew,
      website: "https://adalovelace.com",
      imdbId: "nm0000123",
      startYearInDepartment: undefined,
      productionTypes: undefined,
      spokenLanguages: undefined,
      drivingLicences: undefined,
      workEligibility: undefined,
    },
  },
};

export const WebsiteOnly: Story = {
  args: {
    profile: {
      mode: "self",
      ...baseCrew,
      website: "https://adalovelace.com",
      imdbId: undefined,
      startYearInDepartment: undefined,
      productionTypes: undefined,
      spokenLanguages: undefined,
      drivingLicences: undefined,
      workEligibility: undefined,
    },
  },
};

export const IMDBOnly: Story = {
  args: {
    profile: {
      mode: "self",
      ...baseCrew,
      website: undefined,
      imdbId: "nm0000100",
      startYearInDepartment: undefined,
      productionTypes: undefined,
      spokenLanguages: undefined,
      drivingLicences: undefined,
      workEligibility: undefined,
    },
  },
};

export const Empty: Story = {
  args: {
    profile: {
      mode: "self",
      ...baseCrew,
      website: undefined,
      imdbId: undefined,
      startYearInDepartment: undefined,
      productionTypes: undefined,
      spokenLanguages: undefined,
      drivingLicences: undefined,
      workEligibility: undefined,
    },
  },
};
