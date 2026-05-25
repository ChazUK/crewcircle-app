import type { Id } from "@convex/_generated/dataModel";
import type { Profile as ProfileType } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Temporal } from "temporal-polyfill";

import { Profile } from "./Profile";

const NOW = Temporal.Now.plainDateISO();

function daysFromNow(days: number): number {
  return NOW.add({ days }).toZonedDateTime("UTC").epochMilliseconds;
}

const userId = "user_ada" as Id<"users">;

const fullProfile: ProfileType = {
  userId,
  firstName: "Ada",
  lastName: "Lovelace",
  nickname: "Ace",
  profilePictureUrl: "https://i.pravatar.cc/300?u=ada",
  city: "London",
  country: "GB",
  bio: "Camera operator with 15 years experience in film and television. Passionate about lighting and storytelling.",
  website: "https://adalovelace.com",
  department: "Camera",
  roles: ["Director of Photography", "1st AC", "2nd AC"],
  imdbId: "nm0000001",
  cvUrl: "https://file-examples.com/wp-content/storage/2017/10/file-sample_150kB.pdf",
  certifications: [
    {
      id: "c1",
      name: "CSCS Card",
      issuer: "CITB",
      referenceNumber: "CSC-12345",
      expiresAt: daysFromNow(180),
    },
    {
      id: "c2",
      name: "First Aid at Work",
      issuer: "St John Ambulance",
      referenceNumber: undefined,
      expiresAt: daysFromNow(15),
    },
    {
      id: "c3",
      name: "IPAF Licence",
      issuer: "IPAF",
      referenceNumber: "IPAF-789",
      expiresAt: daysFromNow(-30),
    },
  ],
  memberships: [
    { id: "m1", name: "BECTU", memberNumber: "123456" },
    { id: "m2", name: "ACO", memberNumber: undefined },
  ],
  passports: ["GB", "IE", "US"],
  drivingLicences: ["Car (B)", "Motorcycle (A)", "HGV/LGV (C)"],
  kit: [
    { id: "kit_1", name: "Arri Alexa Mini" },
    { id: "kit_2", name: "RED Komodo" },
    { id: "kit_3", name: "Sony FX6" },
  ],
  spokenLanguages: [
    { code: "en", fluency: "Native" },
    { code: "fr", fluency: "Professional" },
    { code: "es", fluency: "Conversational" },
    { code: "de", fluency: "Basic" },
  ],
  workEligibility: ["USA", "Canada", "Australia"],
  productionCompany: undefined,
};

const minimalProfile: ProfileType = {
  userId,
  firstName: "Grace",
  lastName: "Hopper",
  productionCompany: undefined,
};

const withoutNicknameProfile: ProfileType = {
  ...fullProfile,
  nickname: undefined,
};

const withoutPictureProfile: ProfileType = {
  ...fullProfile,
  profilePictureUrl: undefined,
};

const meta = {
  title: "Profile/Profile",
  component: Profile,
  tags: ["autodocs"],
} satisfies Meta<typeof Profile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { profile: fullProfile } };

export const WithoutNickname: Story = { args: { profile: withoutNicknameProfile } };

export const WithoutPicture: Story = { args: { profile: withoutPictureProfile } };

export const Minimal: Story = { args: { profile: minimalProfile } };
