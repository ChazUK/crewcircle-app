import { ActionSheetIOS, Alert, Platform, Pressable } from "react-native";

import { useImagePicker } from "../../hooks/useImagePicker";

type Props = {
  generateUploadUrl: () => Promise<string>;
  onUpload: (storageId: string) => void;
  onError?: (error: Error) => void;
  children: React.ReactNode;
  aspect?: [number, number];
  allowsEditing?: boolean;
  disabled?: boolean;
};

export function ImagePickerTrigger({
  generateUploadUrl,
  onUpload,
  onError,
  children,
  aspect,
  allowsEditing,
  disabled,
}: Props) {
  const { pickFromCamera, pickFromLibrary, uploading, error } = useImagePicker({
    generateUploadUrl,
    aspect,
    allowsEditing,
  });

  if (error && onError) onError(error);

  const handleCamera = async () => {
    const picked = await pickFromCamera();
    if (picked) onUpload(picked.storageId);
  };

  const handleLibrary = async () => {
    const picked = await pickFromLibrary();
    if (picked) onUpload(picked.storageId);
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
      Alert.alert("Select Image", undefined, [
        { text: "Take Photo", onPress: () => void handleCamera() },
        { text: "Choose from Library", onPress: () => void handleLibrary() },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <Pressable onPress={showOptions} disabled={disabled || uploading}>
      {children}
    </Pressable>
  );
}
