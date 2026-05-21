import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { CertificationsSection } from "./CertificationsSection";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

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

const selfWithMixed: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  ...extras,
  certifications: [
    {
      id: "c1",
      name: "CSCS Card",
      issuer: "CITB",
      referenceNumber: "CSC-12345",
      expiresAt: NOW - 30 * DAY_MS,
    },
    {
      id: "c2",
      name: "First Aid at Work",
      issuer: "St John Ambulance",
      referenceNumber: undefined,
      expiresAt: NOW + 15 * DAY_MS,
    },
    {
      id: "c3",
      name: "IPAF Licence",
      issuer: "IPAF",
      referenceNumber: "IPAF-789",
      expiresAt: NOW + 180 * DAY_MS,
    },
    {
      id: "c4",
      name: "Manual Handling",
      issuer: undefined,
      referenceNumber: undefined,
      expiresAt: undefined,
    },
  ],
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  isPublic: false,
  ...baseCrew,
  ...extras,
  certifications: undefined,
};

const contactWithData: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  ...extras,
  certifications: [
    {
      id: "c1",
      name: "DBS Check",
      issuer: "Disclosure and Barring Service",
      referenceNumber: "DBS-001",
      expiresAt: NOW + 90 * DAY_MS,
    },
  ],
};

const meta = {
  title: "Profile/CertificationsSection",
  component: CertificationsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithMixed },
} satisfies Meta<typeof CertificationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithMixed: Story = { args: { profile: selfWithMixed } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithData: Story = { args: { profile: contactWithData } };
