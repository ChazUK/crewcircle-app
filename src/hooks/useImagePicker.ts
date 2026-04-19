import * as ImagePicker from "expo-image-picker";
import { useState } from "react";

import { uploadImageToConvex } from "../utils/uploadImageConvex";

type Options = {
  generateUploadUrl: () => Promise<string>;
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
};

export function useImagePicker({
  generateUploadUrl,
  aspect = [1, 1],
  quality = 0.8,
  allowsEditing = true,
}: Options) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadUri = async (uri: string): Promise<string | null> => {
    setUploading(true);
    setError(null);
    try {
      return await uploadImageToConvex(uri, generateUploadUrl);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing,
      aspect,
      quality,
    });

    if (result.canceled || !result.assets[0]) return null;
    return uploadUri(result.assets[0].uri);
  };

  const pickFromLibrary = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing,
      aspect,
      quality,
    });

    if (result.canceled || !result.assets[0]) return null;
    return uploadUri(result.assets[0].uri);
  };

  const pickMultipleFromLibrary = async (limit?: number): Promise<string[]> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return [];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality,
    });

    if (result.canceled || !result.assets.length) return [];

    setUploading(true);
    setError(null);
    try {
      return await Promise.all(
        result.assets.map((a: ImagePicker.ImagePickerAsset) =>
          uploadImageToConvex(a.uri, generateUploadUrl),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      return [];
    } finally {
      setUploading(false);
    }
  };

  return { pickFromCamera, pickFromLibrary, pickMultipleFromLibrary, uploading, error };
}
