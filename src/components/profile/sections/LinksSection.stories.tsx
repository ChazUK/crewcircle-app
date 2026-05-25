import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { LinksSection } from "./LinksSection";

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
    website: "https://adalovelace.com",
    imdbId: "nm0000001",
    cvUrl: "https://file-examples.com/wp-content/storage/2017/10/file-sample_150kB.pdf",
  },
};

export const WebsiteOnly: Story = {
  args: {
    website: "https://adalovelace.com",
  },
};

export const IMDBOnly: Story = {
  args: {
    imdbId: "nm0000001",
  },
};

export const CVOnly: Story = {
  args: {
    cvUrl: "https://file-examples.com/wp-content/storage/2017/10/file-sample_150kB.pdf",
  },
};

export const Empty: Story = {
  args: {},
};
