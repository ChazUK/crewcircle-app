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
  let uploadUrl: string;
  try {
    uploadUrl = await generateUploadUrl();
  } catch (err) {
    throw new Error(
      `generateUploadUrl failed: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  let response: Response;
  try {
    response = await fetch(uri);
  } catch (err) {
    throw new Error(
      `fetch image failed for URI ${uri}: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
  if (!response.ok) {
    throw new Error(`fetch image failed for URI ${uri}: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const contentType = blob.type || mimeTypeFromUri(uri);

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body: blob,
    });
  } catch (err) {
    throw new Error(
      `upload to Convex failed: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  if (!uploadResponse.ok) {
    throw new Error(
      `upload to Convex failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
    );
  }

  let result: unknown;
  try {
    result = await uploadResponse.json();
  } catch (err) {
    throw new Error(`upload to Convex failed: response body is not valid JSON`, { cause: err });
  }

  if (
    typeof result !== "object" ||
    result === null ||
    typeof (result as Record<string, unknown>).storageId !== "string" ||
    ((result as Record<string, unknown>).storageId as string).trim() === ""
  ) {
    throw new Error(
      `upload to Convex failed: response missing valid storageId — got ${JSON.stringify(result)}`,
    );
  }

  return (result as { storageId: string }).storageId;
}
