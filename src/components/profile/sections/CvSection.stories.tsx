import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { CvSection } from "./CvSection";

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
} satisfies Meta<typeof CvSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cvUrl: "https://storage.example.com/cv.pdf",
  },
};

export const Empty: Story = {
  args: {
    cvUrl: undefined,
  },
};
