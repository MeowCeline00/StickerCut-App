import type { StickerObject } from "@/types/sticker";
import { createId } from "@/utils/ids";
import { getImageDimensions } from "@/utils/imageDimensions";
import {
  downloadImageToAppStorage,
  saveClipboardImageToAppStorage,
  saveImageToAppStorage,
} from "@/utils/imageStorage";
import { computeDefaultStickerSizeMm, computeImportPositionMm } from "@/utils/stickers";

/**
 * Common image import pipeline.
 *
 * Photos (expo-image-picker), Files (expo-document-picker), and
 * Paste (expo-clipboard) are three very different native APIs, but
 * once each one produces a plain {uri, width, height} (or, for
 * Paste, a base64 data URI instead of a file uri — see
 * createStickerFromClipboardImage below), the rest of the import
 * logic is identical: persist the pixel data into StickerCut's own
 * storage, pick a default physical size and position, and record
 * the source pixel dimensions for later PPI/aspect-ratio use. This
 * file is that shared second half, so editor.tsx's three import
 * handlers stay thin and never duplicate this logic.
 */
export interface ImportableImage {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
}

export interface ClipboardImportableImage {
  /** Base64 data URI, e.g. "data:image/png;base64,...". */
  dataUri: string;
  width: number;
  height: number;
}

function baseStickerFields(
  widthMm: number,
  heightMm: number,
  xMm: number,
  yMm: number,
  zIndex: number,
  sourceUri: string,
  sourceWidthPx: number,
  sourceHeightPx: number,
): StickerObject {
  const aspectRatio =
    sourceWidthPx > 0 && sourceHeightPx > 0 ? sourceWidthPx / sourceHeightPx : undefined;

  return {
    id: createId("sticker"),
    sourceUri,
    xMm,
    yMm,
    widthMm,
    heightMm,
    rotation: 0,
    zIndex,
    backgroundRemoved: false,
    // Cut lines are generated in a later phase; every sticker still
    // needs a value here since the type requires it.
    cutLine: { enabled: false, offsetMm: 2 },
    originalWidthPx: sourceWidthPx,
    originalHeightPx: sourceHeightPx,
    aspectRatio,
  };
}

/**
 * Builds a StickerObject from a Photos or Files import — anything
 * that already has a readable file:// / content:// URI.
 */
export async function createStickerFromImportedImage(
  image: ImportableImage,
  canvasWidthMm: number,
  canvasHeightMm: number,
  zIndex: number,
  importIndex: number,
): Promise<StickerObject> {
  const persistedUri = await saveImageToAppStorage(image.uri, image.fileName);

  const { widthMm, heightMm } = computeDefaultStickerSizeMm(image.width, image.height);
  const { xMm, yMm } = computeImportPositionMm(
    canvasWidthMm,
    canvasHeightMm,
    widthMm,
    heightMm,
    importIndex,
  );

  return baseStickerFields(
    widthMm,
    heightMm,
    xMm,
    yMm,
    zIndex,
    persistedUri,
    image.width,
    image.height,
  );
}

/**
 * Builds a StickerObject by downloading an image from a URL — for
 * when the user pastes a link (e.g. copied via "Copy image address"
 * in a browser) rather than actual image data. Unlike the other two
 * builders, this one both persists AND discovers the pixel
 * dimensions itself: downloadImageToAppStorage() saves straight
 * into the stickers directory (no separate copy step needed), and
 * getImageDimensions() reads the now-local file's size, since a
 * remote URL never came with width/height attached the way a
 * picker result does.
 */
export async function createStickerFromUrl(
  url: string,
  canvasWidthMm: number,
  canvasHeightMm: number,
  zIndex: number,
  importIndex: number,
): Promise<StickerObject> {
  const downloadedFile = await downloadImageToAppStorage(url);
  const { width, height } = await getImageDimensions(downloadedFile.uri);

  const { widthMm, heightMm } = computeDefaultStickerSizeMm(width, height);
  const { xMm, yMm } = computeImportPositionMm(
    canvasWidthMm,
    canvasHeightMm,
    widthMm,
    heightMm,
    importIndex,
  );

  return baseStickerFields(widthMm, heightMm, xMm, yMm, zIndex, downloadedFile.uri, width, height);
}

/**
 * Builds a StickerObject from a clipboard Paste. Kept separate from
 * createStickerFromImportedImage because the persistence step is
 * genuinely different (decode base64 + write bytes, synchronously,
 * instead of copying an existing file asynchronously) — but the
 * sizing/positioning/metadata logic below it is shared via
 * baseStickerFields so the two never drift apart.
 */
export function createStickerFromClipboardImage(
  image: ClipboardImportableImage,
  canvasWidthMm: number,
  canvasHeightMm: number,
  zIndex: number,
  importIndex: number,
): StickerObject {
  const persistedUri = saveClipboardImageToAppStorage(image.dataUri);

  const { widthMm, heightMm } = computeDefaultStickerSizeMm(image.width, image.height);
  const { xMm, yMm } = computeImportPositionMm(
    canvasWidthMm,
    canvasHeightMm,
    widthMm,
    heightMm,
    importIndex,
  );

  return baseStickerFields(
    widthMm,
    heightMm,
    xMm,
    yMm,
    zIndex,
    persistedUri,
    image.width,
    image.height,
  );
}
