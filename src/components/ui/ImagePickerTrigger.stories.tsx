import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ImagePickerTrigger } from "./ImagePickerTrigger";

const mockGenerateUploadUrl = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return "https://example.com/upload";
};

const PlaceholderAvatar = (
  <View
    style={{
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: "#e0e0e0",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#ccc",
      borderStyle: "dashed",
    }}
  >
    <Text style={{ fontSize: 32 }}>👤</Text>
  </View>
);

const meta = {
  title: "UI/ImagePickerTrigger",
  component: ImagePickerTrigger,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 32, alignItems: "center", backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    generateUploadUrl: mockGenerateUploadUrl,
    onUpload: () => {},
    children: PlaceholderAvatar,
  },
} satisfies Meta<typeof ImagePickerTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AvatarPlaceholder: Story = {
  args: {},
  render: (args) => {
    const [storageId, setStorageId] = useState<string | null>(null);
    return (
      <View style={{ alignItems: "center", gap: 8 }}>
        <ImagePickerTrigger {...args} onUpload={(id) => setStorageId(id)}>
          {PlaceholderAvatar}
        </ImagePickerTrigger>
        <Text style={{ fontSize: 12, color: "#888" }}>Tap to change photo</Text>
        {storageId && <Text style={{ fontSize: 11, color: "#4caf50" }}>Uploaded: {storageId}</Text>}
      </View>
    );
  },
};

export const EditButtonOverlay: Story = {
  args: {},
  render: (args) => {
    const [storageId, setStorageId] = useState<string | null>(null);
    return (
      <View style={{ alignItems: "center", gap: 8 }}>
        <ImagePickerTrigger {...args} onUpload={(id) => setStorageId(id)}>
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#bdbdbd",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 32 }}>🎬</Text>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#000",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#fff",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14 }}>✎</Text>
            </View>
          </View>
        </ImagePickerTrigger>
        <Text style={{ fontSize: 12, color: "#888" }}>Tap avatar to edit</Text>
        {storageId && <Text style={{ fontSize: 11, color: "#4caf50" }}>Uploaded: {storageId}</Text>}
      </View>
    );
  },
};

export const BannerImage: Story = {
  args: { allowsEditing: false },
  render: (args) => {
    const [storageId, setStorageId] = useState<string | null>(null);
    return (
      <View style={{ width: "100%", gap: 8 }}>
        <ImagePickerTrigger {...args} onUpload={(id) => setStorageId(id)}>
          <View
            style={{
              width: "100%",
              height: 160,
              borderRadius: 12,
              backgroundColor: "#e8eaf6",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#9fa8da",
              borderStyle: "dashed",
            }}
          >
            <Text style={{ fontSize: 24 }}>🖼️</Text>
            <Text style={{ color: "#7986cb", marginTop: 4, fontSize: 13 }}>Tap to add banner</Text>
          </View>
        </ImagePickerTrigger>
        {storageId && <Text style={{ fontSize: 11, color: "#4caf50" }}>Uploaded: {storageId}</Text>}
      </View>
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <View style={{ alignItems: "center", gap: 8 }}>
      <ImagePickerTrigger {...args}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#f5f5f5",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.5,
          }}
        >
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
      </ImagePickerTrigger>
      <Text style={{ fontSize: 12, color: "#bbb" }}>Upload disabled</Text>
    </View>
  ),
};

export const WithUploadingState: Story = {
  args: { disabled: true },
  render: (args) => (
    <View style={{ alignItems: "center", gap: 8 }}>
      <ImagePickerTrigger {...args}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#e0e0e0",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
        </View>
      </ImagePickerTrigger>
      <Text style={{ fontSize: 12, color: "#888" }}>Uploading…</Text>
    </View>
  ),
};
