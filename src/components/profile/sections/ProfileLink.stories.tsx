import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { ProfileLink } from "./ProfileLink";

const meta = {
  title: "Profile/ProfileLink",
  component: ProfileLink,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof ProfileLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: "url",
    url: "https://example.com",
  },
};

export const IMDB: Story = {
  args: {
    type: "imdb",
    url: "https://www.imdb.com/name/nm0000001",
  },
};

export const Download: Story = {
  args: {
    type: "download",
    url: "https://file-examples.com/wp-content/storage/2017/10/file-sample_150kB.pdf",
  },
};
