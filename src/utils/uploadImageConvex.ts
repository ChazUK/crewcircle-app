/**
 * Uploads a local image URI to Convex file storage.
 *
 * @param uri - The local image URI (e.g. from expo-image-picker)
 * @param generateUploadUrl - A Convex mutation that returns a short-lived upload URL
 * @returns The Convex storage ID string
 */
export async function uploadImageToConvex(
  uri: string,
  generateUploadUrl: () => Promise<string>,
): Promise<string> {
  const uploadUrl = await generateUploadUrl();

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URI: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "image/jpeg",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload image to Convex: ${uploadResponse.status} ${uploadResponse.statusText}`,
    );
  }

  const result = (await uploadResponse.json()) as { storageId: string };
  return result.storageId;
}
