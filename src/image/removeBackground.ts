import { File } from "expo-file-system";

import { API_CONFIG } from "@/config/api";

import { base64ToUint8Array } from "@/utils/base64";

import { getImageDimensions } from "@/utils/imageDimensions";

import { saveProcessedImageToAppStorage } from "@/utils/imageStorage";

export interface RemoveBackgroundResult {
  uri: string;
  width: number;
  height: number;
}

interface RemoveBackgroundApiResponse {
  imageBase64: string;
  mimeType: string;
}

interface BackendErrorResponse {
  detail?: string;
}

export class BackgroundRemovalUnavailableError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "BackgroundRemovalUnavailableError";
  }
}

// ============================================================
// MIME TYPE
// ============================================================

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

    case "gif":
      return "image/gif";

    default:
      return "application/octet-stream";
  }
}

// ============================================================
// BACKEND ERROR PARSER
// ============================================================

async function getBackendErrorMessage(
  response: Response,
): Promise<string | null> {
  try {
    const payload = (await response.json()) as BackendErrorResponse;

    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // Ignore malformed/non-JSON
    // backend errors.
  }

  return null;
}

// ============================================================
// REMOVE BACKGROUND
// ============================================================

export async function removeImageBackground(
  sourceUri: string,
): Promise<RemoveBackgroundResult> {
  if (__DEV__) {
    console.log("[Remove BG] backend URL:", API_CONFIG.backendUrl);

    console.log("[Remove BG] source URI:", sourceUri);
  }

  // ==========================================================
  // 1. READ SOURCE IMAGE
  // ==========================================================

  let imageBase64: string;

  try {
    const sourceFile = new File(sourceUri);

    if (!sourceFile.exists) {
      throw new Error("Source file does not exist.");
    }

    /*
     * Expo FileSystem File API.
     *
     * Read the actual local image bytes
     * as Base64.
     *
     * This avoids React Native's broken
     * FormData file-part path that produced:
     *
     * Unsupported FormDataPart implementation
     */
    imageBase64 = sourceFile.base64Sync();
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] " + "source read failed:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "StickerCut could not read " + "this image. " + "Try importing it again.",
    );
  }

  if (!imageBase64 || imageBase64.length === 0) {
    throw new BackgroundRemovalUnavailableError(
      "The selected image " + "contains no image data.",
    );
  }

  if (__DEV__) {
    console.log("[Remove BG] " + "source base64 length:", imageBase64.length);
  }

  // ==========================================================
  // 2. SEND JSON TO BACKEND
  // ==========================================================

  let response: Response;

  try {
    response = await fetch(`${API_CONFIG.backendUrl}/remove-bg-base64`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Accept: "application/json",
      },

      body: JSON.stringify({
        imageBase64,

        mimeType: inferUploadMimeType(sourceUri),
      }),
    });
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] " + "network error:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "Could not connect to " +
        "the background-removal " +
        "service. " +
        "Make sure the local " +
        "backend is running.",
    );
  }

  if (__DEV__) {
    console.log("[Remove BG] " + "response status:", response.status);
  }

  // ==========================================================
  // 3. HANDLE HTTP ERRORS
  // ==========================================================

  if (!response.ok) {
    const backendMessage = await getBackendErrorMessage(response);

    if (__DEV__) {
      console.error(
        "[Remove BG] " + "backend returned error:",
        response.status,
        backendMessage,
      );
    }

    if (response.status === 400) {
      throw new BackgroundRemovalUnavailableError(
        backendMessage ??
          "This image could " + "not be processed. " + "Try another image.",
      );
    }

    if (response.status === 503) {
      throw new BackgroundRemovalUnavailableError(
        backendMessage ??
          "The background-removal " +
            "model is still loading. " +
            "Try again shortly.",
      );
    }

    throw new BackgroundRemovalUnavailableError(
      backendMessage ??
        "The background-removal " +
          "service failed while " +
          "processing this image.",
    );
  }

  // ==========================================================
  // 4. PARSE BACKEND JSON
  // ==========================================================

  let payload: RemoveBackgroundApiResponse;

  try {
    payload = (await response.json()) as RemoveBackgroundApiResponse;
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] " + "JSON parsing failed:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "The background-removal " + "service returned " + "an invalid response.",
    );
  }

  if (
    !payload ||
    typeof payload.imageBase64 !== "string" ||
    payload.imageBase64.length === 0
  ) {
    throw new BackgroundRemovalUnavailableError(
      "The background-removal " + "service returned " + "no processed image.",
    );
  }

  if (__DEV__) {
    console.log(
      "[Remove BG] " + "output base64 length:",
      payload.imageBase64.length,
    );
  }

  // ==========================================================
  // 5. BASE64 -> UINT8ARRAY
  // ==========================================================

  let outputBytes: Uint8Array;

  try {
    outputBytes = base64ToUint8Array(payload.imageBase64);
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] " + "Base64 decode failed:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "StickerCut could not " + "decode the processed image.",
    );
  }

  if (outputBytes.byteLength === 0) {
    throw new BackgroundRemovalUnavailableError(
      "The processed image " + "was empty.",
    );
  }

  if (__DEV__) {
    console.log("[Remove BG] " + "decoded PNG bytes:", outputBytes.byteLength);
  }

  // ==========================================================
  // 6. SAVE TRANSPARENT PNG
  // ==========================================================

  let uri: string;

  try {
    uri = saveProcessedImageToAppStorage(outputBytes, "png");
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] " + "processed image save failed:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "StickerCut could not " + "save the processed image.",
    );
  }

  if (__DEV__) {
    console.log("[Remove BG] saved URI:", uri);
  }

  // ==========================================================
  // 7. VERIFY IMAGE + DIMENSIONS
  // ==========================================================

  try {
    const { width, height } = await getImageDimensions(uri);

    if (__DEV__) {
      console.log("[Remove BG] " + "processed dimensions:", width, "x", height);
    }

    return {
      uri,
      width,
      height,
    };
  } catch (error) {
    if (__DEV__) {
      console.error("[Remove BG] " + "processed image load failed:", error);
    }

    throw new BackgroundRemovalUnavailableError(
      "The processed image " + "was saved but could " + "not be loaded.",
    );
  }
}
