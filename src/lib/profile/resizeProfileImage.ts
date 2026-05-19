import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

export async function resizeProfileImage(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION, height: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG },
  );
  return result.uri;
}
