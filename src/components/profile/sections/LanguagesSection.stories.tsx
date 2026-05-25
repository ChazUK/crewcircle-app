import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { LanguagesSection } from "./LanguagesSection";

const meta = {
  title: "Profile/LanguagesSection",
  component: LanguagesSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof LanguagesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    spokenLanguages: [
      { code: "de", fluency: "Basic" },
      { code: "en", fluency: "Fluent" },
      { code: "es", fluency: "Conversational" },
      { code: "fr", fluency: "Professional" },
      { code: "ja", fluency: "Native" },
    ],
  },
};

export const Empty: Story = {
  args: {},
};
