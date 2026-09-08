// Background-removal processing adapter.
//
// StickerObject already models this correctly (sourceUri is never
// overwritten; processedUri + backgroundRemoved carry the result), and
// the Remove BG button in editor.tsx is wired to call this function.
//
// This calls a local, free background-removal backend (backend/, a
// FastAPI + rembg server you run on your own machine — see
// backend/README.md for setup). No paid API, no API key ships in this
// app: the backend does the actual processing entirely on your own
// computer, and this function just uploads the source image to it and
// saves back whatever transparent PNG it returns.

import { API_CONFIG } from "@/config/api";
import { getImageDimensions } from "@/utils/imageDimensions";
import { saveProcessedImageToAppStorage } from "@/utils/imageStorage";

export interface RemoveBackgroundResult {
  uri: string;
  width: number;
  height: number;
}

export class BackgroundRemovalUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackgroundRemovalUnavailableError";
  }
}

function inferUploadMimeType(uri: string): string {
  const cleanUri = uri.split("?")[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleanUri);
  const extension = match?.[1]?.toLowerCase();

  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      // rembg/PIL can generally sniff the real format from content, and
      // the backend also validates the actual bytes — this is just a
      // reasonable multipart Content-Type when the extension is
      // ambiguous or missing.
      return "image/jpeg";
  }
}

/**
 * Attempts to remove the background from the image at `sourceUri` by
 * uploading it to the local background-removal backend (see backend/),
 * and saves the returned transparent PNG into app-owned persistent
 * storage.
 *
 * Throws BackgroundRemovalUnavailableError with a user-facing message
 * on any failure (backend not running, network issue, unsupported
 * image, server-side processing error) — never returns a fake result.
 */
export async function removeImageBackground(
  sourceUri: string,
): Promise<RemoveBackgroundResult> {
  if (__DEV__) {
    // Temporary development diagnostic — confirms which URL this
    // build actually resolved (EXPO_PUBLIC_BACKEND_URL from .env, or
    // the Android-emulator default from src/config/api.ts) without
    // needing to inspect .env by hand.
    console.log("[Remove BG] backend URL:", API_CONFIG.backendUrl);
  }

  const mimeType = inferUploadMimeType(sourceUri);

  const formData = new FormData();
  // React Native's FormData accepts a { uri, name, type } object in
  // place of a web File/Blob (which don't exist in this environment) —
  // this is the standard RN upload pattern. TypeScript's DOM lib types
  // FormData.append's second argument as string | Blob, so this needs
  // a cast; the object shape itself is what React Native's networking
  // layer actually expects at runtime.
  formData.append("image", {
    uri: sourceUri,
    name: `upload.${mimeType.split("/")[1] ?? "jpg"}`,
    type: mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    // Deliberately NOT setting a Content-Type header: fetch/FormData
    // needs to generate the multipart boundary itself, and manually
    // setting it (e.g. to "multipart/form-data") breaks the boundary
    // and the backend won't be able to parse the upload.
    response = await fetch(`${API_CONFIG.backendUrl}/remove-bg`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    // The user-facing message below stays generic on purpose (it
    // doesn't know WHY the connection failed), but the real error is
    // exactly what distinguishes "cleartext HTTP blocked" from "wrong
    // IP" from "backend not running" etc — never swallow it silently.
    if (__DEV__) {
      console.error("[Remove BG] network error:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "Could not connect to the background-removal service. Make sure " +
        "the local backend is running (see backend/README.md) and that " +
        "EXPO_PUBLIC_BACKEND_URL in your .env points at it.",
    );
  }

  if (__DEV__) {
    console.log("[Remove BG] response status:", response.status);
  }

  if (!response.ok) {
    if (response.status === 400) {
      throw new BackgroundRemovalUnavailableError(
        "This image couldn't be processed. Try a different photo.",
      );
    }

    throw new BackgroundRemovalUnavailableError(
      "The background-removal service ran into a problem processing " +
        "this image. Please try again.",
    );
  }

  let bytes: Uint8Array;
  try {
    const buffer = await response.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] failed to read response body:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "The background-removal service returned an unreadable response.",
    );
  }

  if (__DEV__) {
    console.log("[Remove BG] bytes:", bytes.byteLength);
  }

  if (bytes.byteLength === 0) {
    throw new BackgroundRemovalUnavailableError(
      "The background-removal service returned an empty result.",
    );
  }

  const uri = saveProcessedImageToAppStorage(bytes, "png");

  if (__DEV__) {
    console.log("[Remove BG] saved URI:", uri);
  }

  const { width, height } = await getImageDimensions(uri);

  return { uri, width, height };
}
