import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { ProductionCompanySection } from "./ProductionCompanySection";

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
} satisfies Meta<typeof ProductionCompanySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    productionCompany: "Acme Films",
  },
};

export const Empty: Story = {
  args: {},
};
