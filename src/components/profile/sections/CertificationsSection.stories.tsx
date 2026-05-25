import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Temporal } from "temporal-polyfill";

import { CertificationsSection } from "./CertificationsSection";

const NOW = Temporal.Now.plainDateISO();

function daysFromNow(days: number): number {
  return NOW.add({ days }).toZonedDateTime("UTC").epochMilliseconds;
}

const meta = {
  title: "Profile/CertificationsSection",
  component: CertificationsSection,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof CertificationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    certifications: [
      {
        id: "c1",
        name: "CSCS Card",
        issuer: "CITB",
        referenceNumber: "CSC-12345",
        expiresAt: daysFromNow(-30),
      },
      {
        id: "c2",
        name: "First Aid at Work",
        issuer: "The Royal Station of St John Ambulance",
        referenceNumber: undefined,
        expiresAt: daysFromNow(15),
      },
      {
        id: "c3",
        name: "IPAF Licence",
        issuer: "IPAF",
        referenceNumber: "IPAF-789",
        expiresAt: daysFromNow(180),
      },
      {
        id: "c4",
        name: "Manual Handling",
        issuer: undefined,
        referenceNumber: undefined,
        expiresAt: undefined,
      },
    ],
  },
};

export const Empty: Story = {
  args: {},
};
