import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import {
  AppleCalendarIcon,
  GoogleCalendarIcon,
  LinkCalendarIcon,
  MicrosoftCalendarIcon,
} from "./CalendarProviderIcons";

type ShowcaseProps = {
  size: number;
};

function AllProviders({ size }: ShowcaseProps) {
  const providers = [
    { label: "Google Calendar", Icon: GoogleCalendarIcon },
    { label: "Apple Calendar", Icon: AppleCalendarIcon },
    { label: "Outlook", Icon: MicrosoftCalendarIcon },
    { label: "iCal URL", Icon: LinkCalendarIcon },
  ];

  return (
    <View style={{ gap: 20 }}>
      {providers.map(({ label, Icon }) => (
        <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Icon size={size} />
          <Text style={{ fontSize: 16, color: "#1f2937" }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const meta = {
  title: "UI/Icons/CalendarProviderIcons",
  component: AllProviders,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#f9f9f9",
        }}
      >
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "range", min: 16, max: 128, step: 4 } },
  },
  args: { size: 40 },
} satisfies Meta<typeof AllProviders>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {};

export const Small: Story = { args: { size: 20 } };
export const Large: Story = { args: { size: 96 } };

export const Google: Story = {
  render: ({ size }) => <GoogleCalendarIcon size={size} />,
};

export const Apple: Story = {
  render: ({ size }) => <AppleCalendarIcon size={size} />,
};

export const Outlook: Story = {
  render: ({ size }) => <MicrosoftCalendarIcon size={size} />,
};

export const Link: Story = {
  render: ({ size }) => <LinkCalendarIcon size={size} />,
};
