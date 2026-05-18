import { COUNTRIES } from "@shared/countries/countries";
import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";

import { TagInput } from "./TagInput";

const meta = {
  title: "Form/TagInput",
  component: TagInput,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    tags: [],
    onChange: () => {},
    placeholder: "Add a tag...",
  },
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [tags, setTags] = useState<string[]>(args.tags ?? []);
  return <TagInput {...args} tags={tags} onChange={setTags} />;
};

export const Default: Story = {
  render: InteractiveRender,
};

export const WithLabel: Story = {
  args: {
    label: "Special Skills",
    placeholder: "e.g. Drone operator",
  },
  render: InteractiveRender,
};

export const WithPrefilledTags: Story = {
  args: {
    label: "Kit",
    placeholder: "e.g. ARRI ALEXA Mini LF",
    tags: ["Sony FX6", "DJI RS 3 Pro", "Tilta Nucleus-M"],
  },
  render: InteractiveRender,
};

export const EmptyWithPlaceholder: Story = {
  args: {
    placeholder: "Type a skill and press return or Add",
    tags: [],
  },
  render: InteractiveRender,
};

export const WithMaxTags: Story = {
  args: {
    label: "Skills (max 3)",
    placeholder: "Add a skill...",
    tags: [],
    maxTags: 3,
  },
  render: InteractiveRender,
};

export const WithMaxTagsAlmostFull: Story = {
  args: {
    label: "Skills (max 3)",
    placeholder: "Add a skill...",
    tags: ["Drone operator", "Steadicam"],
    maxTags: 3,
  },
  render: InteractiveRender,
};

export const WithMaxTagsFull: Story = {
  args: {
    label: "Skills (max 3)",
    placeholder: "Add a skill...",
    tags: ["Drone operator", "Underwater camera", "Steadicam"],
    maxTags: 3,
  },
  render: InteractiveRender,
};

const COUNTRY_NAMES = COUNTRIES.map((country) => country.name);

export const WithAutoComplete: Story = {
  args: {
    label: "Countries",
    placeholder: "Add a country...",
    tags: [],
    maxSuggestions: 5,
    autoCompleteFn: (text, currentTags) => {
      const used = new Set(currentTags.map((t) => t.toLowerCase()));
      const query = text.toLowerCase();
      return COUNTRY_NAMES.filter(
        (name) => name.toLowerCase().includes(query) && !used.has(name.toLowerCase()),
      );
    },
  },
  render: InteractiveRender,
};
