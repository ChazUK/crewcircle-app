import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { LocationSection } from "./LocationSection";

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
};

const selfWithData: ViewableProfile = {
  mode: "self",
  ...baseCrew,
  city: "London",
  country: "GB",
  productionTypes: undefined,
};

const selfEmpty: ViewableProfile = {
  mode: "self",
  ...baseCrew,
  city: undefined,
  country: undefined,
  productionTypes: undefined,
};

const contactWithData: ViewableProfile = {
  mode: "contact",
  ...baseCrew,
  city: "Los Angeles",
  country: "US",
  productionTypes: undefined,
};

const publicCard: ViewableProfile = {
  mode: "public-card",
  ...baseCrew,
  city: "Berlin",
  country: "DE",
};

const meta = {
  title: "Profile/LocationSection",
  component: LocationSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: selfWithData },
} satisfies Meta<typeof LocationSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelfWithData: Story = { args: { profile: selfWithData } };
export const SelfEmpty: Story = { args: { profile: selfEmpty } };
export const ContactWithData: Story = { args: { profile: contactWithData } };
export const PublicCard: Story = { args: { profile: publicCard } };
