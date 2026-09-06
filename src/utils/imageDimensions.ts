import { Image as RNImage } from "react-native";

/**
 * expo-document-picker (unlike expo-image-picker) does not return
 * an image's pixel width/height — it only knows about the file
 * itself. React Native's own Image.getSize() can read the
 * dimensions of any local file:// or content:// URI, so this
 * wraps that callback API in a Promise for use in the shared
 * import pipeline (see src/image/importImage.ts).
 */
export function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}
