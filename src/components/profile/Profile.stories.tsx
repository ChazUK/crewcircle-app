import type { Meta, StoryObj } from "@storybook/react-native";

import { Profile } from "./Profile";

const meta = {
  title: "Profile/Profile",
  component: Profile,
  tags: ["autodocs"],
} satisfies Meta<typeof Profile>;

export default meta;
type Story = StoryObj<typeof meta>;

// export const SelfWithNickname: Story = { args: { profile: selfWithNicknameProfile } };
// export const SelfWithoutNickname: Story = { args: { profile: selfWithoutNicknameProfile } };
// export const Contact: Story = { args: { profile: contactProfile } };
// export const PublicCard: Story = { args: { profile: publicCardProfile } };
// export const PMSelf: Story = { args: { profile: pmSelfProfile } };
