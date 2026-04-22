import * as ImagePicker from "expo-image-picker";
import { useState } from "react";

import { uploadImageToConvex } from "../utils/uploadImageConvex";

type Options = {
  generateUploadUrl: () => Promise<string>;
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
};

export type PickedImage = { uri: string; storageId: string };

export function useImagePicker({
  generateUploadUrl,
  aspect = [1, 1],
  quality = 0.8,
  allowsEditing = true,
}: Options) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadUri = async (uri: string): Promise<PickedImage | null> => {
    setUploading(true);
    setError(null);
    try {
      const storageId = await uploadImageToConvex(uri, generateUploadUrl);
      return { uri, storageId };
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async (): Promise<PickedImage | null> => {
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

  const pickFromLibrary = async (): Promise<PickedImage | null> => {
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

  const pickMultipleFromLibrary = async (limit?: number): Promise<PickedImage[]> => {
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
        result.assets.map(async (a: ImagePicker.ImagePickerAsset) => ({
          uri: a.uri,
          storageId: await uploadImageToConvex(a.uri, generateUploadUrl),
        })),
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
