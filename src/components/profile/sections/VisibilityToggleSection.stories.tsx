import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";

import { VisibilityToggleSection } from "./VisibilityToggleSection";

function Harness({ isPublic: initialValue }: { isPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialValue);
  return <VisibilityToggleSection isPublic={isPublic} onToggle={setIsPublic} />;
}

const meta = {
  title: "Profile/VisibilityToggleSection",
  component: VisibilityToggleSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: { isPublic: true, onToggle: () => {} },
} satisfies Meta<typeof VisibilityToggleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToggleOn: Story = {
  render: () => <Harness isPublic={true} />,
};

export const ToggleOff: Story = {
  render: () => <Harness isPublic={false} />,
};
