import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { ImageGalleryPicker } from "./ImageGalleryPicker";

type ImageItem = { uri: string; storageId?: string };

const mockGenerateUploadUrl = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return "https://example.com/upload";
};

const SAMPLE_IMAGES: ImageItem[] = [
  {
    uri: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=200",
    storageId: "id_1",
  },
  {
    uri: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200",
    storageId: "id_2",
  },
  {
    uri: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=200",
    storageId: "id_3",
  },
];

const meta = {
  title: "UI/ImageGalleryPicker",
  component: ImageGalleryPicker,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    generateUploadUrl: mockGenerateUploadUrl,
    images: [],
    onChange: () => {},
  },
} satisfies Meta<typeof ImageGalleryPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveRender: Story["render"] = (args) => {
  const [images, setImages] = useState<ImageItem[]>(args.images ?? []);
  return (
    <View style={{ gap: 12 }}>
      <ImageGalleryPicker {...args} images={images} onChange={setImages} />
      <Text style={{ fontSize: 11, color: "#888" }}>
        {images.length} image{images.length !== 1 ? "s" : ""}
        {images.length > 0
          ? ` · storageIds: [${images.map((i) => i.storageId ?? "pending").join(", ")}]`
          : ""}
      </Text>
    </View>
  );
};

export const Empty: Story = {
  render: InteractiveRender,
};

export const WithImages: Story = {
  args: { images: SAMPLE_IMAGES },
  render: InteractiveRender,
};

export const WithMaxImages: Story = {
  args: { images: SAMPLE_IMAGES, maxImages: 4 },
  render: InteractiveRender,
};

export const AtMaxCapacity: Story = {
  args: { images: SAMPLE_IMAGES, maxImages: 3 },
  render: (args) => {
    const [images, setImages] = useState<ImageItem[]>(args.images ?? []);
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 13, color: "#666" }}>Max 3 images - add button hidden</Text>
        <ImageGalleryPicker {...args} images={images} onChange={setImages} />
      </View>
    );
  },
};

export const SingleImageMode: Story = {
  args: { maxImages: 1 },
  render: InteractiveRender,
};

export const ProfilePhotos: Story = {
  args: {
    images: SAMPLE_IMAGES.slice(0, 2),
    maxImages: 6,
  },
  render: (args) => {
    const [images, setImages] = useState<ImageItem[]>(args.images ?? []);
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "600", fontSize: 14 }}>Portfolio Photos</Text>
        <Text style={{ fontSize: 12, color: "#888" }}>Add up to 6 photos</Text>
        <ImageGalleryPicker {...args} images={images} onChange={setImages} maxImages={6} />
      </View>
    );
  },
};
