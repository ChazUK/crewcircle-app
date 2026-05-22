import type { Id } from "@convex/_generated/dataModel";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { ProductionCompanySection } from "./ProductionCompanySection";

const basePm = {
  userId: "user_1" as Id<"users">,
  firstName: "Grace",
  lastName: "Hopper",
  profilePictureUrl: undefined,
  userType: "production-manager" as const,
  nickname: undefined,
  city: "London",
  country: "GB",
  bio: undefined,
  website: undefined,
};

const withValue: ViewableProfile = {
  mode: "pm-self",
  ...basePm,
  productionCompany: "Acme Films",
};

const empty: ViewableProfile = {
  mode: "pm-self",
  ...basePm,
  productionCompany: undefined,
};

const meta = {
  title: "Profile/ProductionCompanySection",
  component: ProductionCompanySection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { profile: withValue },
} satisfies Meta<typeof ProductionCompanySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithValue: Story = { args: { profile: withValue } };
export const Empty: Story = { args: { profile: empty } };
