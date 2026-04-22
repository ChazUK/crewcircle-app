const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

function mimeTypeFromUri(uri: string): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_TYPES[ext] ?? "image/jpeg";
}

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
  const contentType = blob.type || mimeTypeFromUri(uri);

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
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
