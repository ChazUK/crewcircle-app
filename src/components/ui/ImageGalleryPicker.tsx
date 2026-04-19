import { Image } from "expo-image";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useImagePicker } from "../../hooks/useImagePicker";

type ImageItem = {
  uri: string;
  storageId?: string;
};

type Props = {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  generateUploadUrl: () => Promise<string>;
  maxImages?: number;
};

export function ImageGalleryPicker({ images, onChange, generateUploadUrl, maxImages }: Props) {
  const { pickFromCamera, pickMultipleFromLibrary, uploading } = useImagePicker({
    generateUploadUrl,
    allowsEditing: false,
  });

  const canAddMore = maxImages === undefined || images.length < maxImages;
  const remaining = maxImages !== undefined ? maxImages - images.length : undefined;

  const handleCamera = async () => {
    const storageId = await pickFromCamera();
    if (storageId) onChange([...images, { uri: storageId, storageId }]);
  };

  const handleLibrary = async () => {
    const storageIds = await pickMultipleFromLibrary(remaining);
    if (storageIds.length) {
      onChange([...images, ...storageIds.map((id) => ({ uri: id, storageId: id }))]);
    }
  };

  const showOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) void handleCamera();
          if (index === 2) void handleLibrary();
        },
      );
    } else {
      Alert.alert("Add Image", undefined, [
        { text: "Take Photo", onPress: () => void handleCamera() },
        { text: "Choose from Library", onPress: () => void handleLibrary() },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2 p-1">
        {images.map((image, index) => (
          <View key={image.storageId ?? image.uri} className="relative">
            <Image
              source={{ uri: image.uri }}
              style={{ width: 80, height: 80, borderRadius: 8 }}
              contentFit="cover"
            />
            <Pressable
              onPress={() => removeImage(index)}
              className="absolute -top-2 -right-2 bg-danger rounded-full w-5 h-5 items-center justify-center"
            >
              <Text className="text-white text-xs font-bold leading-none">×</Text>
            </Pressable>
          </View>
        ))}

        {canAddMore && (
          <Pressable
            onPress={showOptions}
            disabled={uploading}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-default-300 items-center justify-center bg-default-50"
          >
            {uploading ? (
              <ActivityIndicator />
            ) : (
              <Text className="text-3xl text-default-400 leading-none">+</Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
