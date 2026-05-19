import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import { resizeProfileImage } from "@/lib/profile/resizeProfileImage";

export function usePictureUpload() {
  const generateUploadUrl = useMutation(
    api.users.mutations.generateProfilePictureUploadUrl.generateProfilePictureUploadUrl,
  );
  const setProfilePicture = useMutation(api.users.mutations.setProfilePicture.setProfilePicture);

  return async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];

    try {
      const resizedUri = await resizeProfileImage(asset.uri);

      const uploadUrl = await generateUploadUrl();

      const response = await fetch(resizedUri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();

      await setProfilePicture({ fileId: storageId });
    } catch {
      Alert.alert("Upload failed", "Could not update your profile picture. Please try again.");
    }
  };
}
