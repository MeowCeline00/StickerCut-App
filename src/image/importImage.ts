import {
  DEFAULT_CUT_LINE_COLOR,
  DEFAULT_CUT_LINE_SHAPE,
} from "@/constants/cut-line";

import type {
  StickerObject,
} from "@/types/sticker";

import {
  createId,
} from "@/utils/ids";

import {
  getImageDimensions,
} from "@/utils/imageDimensions";

import {
  downloadImageToAppStorage,
  saveClipboardImageToAppStorage,
  saveImageToAppStorage,
} from "@/utils/imageStorage";

import {
  computeDefaultStickerSizeMm,
  computeImportPositionMm,
} from "@/utils/stickers";

export interface ImportableImage {
  uri: string;
  width: number;
  height: number;

  fileName?:
    | string
    | null;
}

export interface ClipboardImportableImage {
  dataUri: string;

  width: number;
  height: number;
}

/**
 * Every input source becomes the same StickerObject.
 *
 * Editor logic therefore does not care whether artwork came from:
 *
 * Photos
 * Files
 * Clipboard bitmap
 * URL
 */
function createBaseSticker(
  sourceUri: string,

  sourceWidthPx: number,
  sourceHeightPx: number,

  canvasWidthMm: number,
  canvasHeightMm: number,

  zIndex: number,
  importIndex: number,
): StickerObject {
  const {
    widthMm,
    heightMm,
  } =
    computeDefaultStickerSizeMm(
      sourceWidthPx,
      sourceHeightPx,
    );

  const {
    xMm,
    yMm,
  } =
    computeImportPositionMm(
      canvasWidthMm,
      canvasHeightMm,

      widthMm,
      heightMm,

      importIndex,
    );

  const aspectRatio =
    sourceWidthPx > 0 &&
    sourceHeightPx > 0
      ? sourceWidthPx /
        sourceHeightPx
      : 1;

  return {
    id:
      createId(
        "sticker",
      ),

    sourceUri,

    xMm,
    yMm,

    widthMm,
    heightMm,

    rotation: 0,

    zIndex,

    backgroundRemoved:
      false,

    originalWidthPx:
      sourceWidthPx,

    originalHeightPx:
      sourceHeightPx,

    aspectRatio,

    aspectLocked:
      true,

    cutLine: {
      enabled:
        false,

      offsetMm:
        2,

      shape:
        DEFAULT_CUT_LINE_SHAPE,

      color:
        DEFAULT_CUT_LINE_COLOR,
    },
  };
}

export async function createStickerFromImportedImage(
  image: ImportableImage,

  canvasWidthMm: number,
  canvasHeightMm: number,

  zIndex: number,
  importIndex: number,
): Promise<StickerObject> {
  const persistedUri =
    await saveImageToAppStorage(
      image.uri,
      image.fileName,
    );

  return createBaseSticker(
    persistedUri,

    image.width,
    image.height,

    canvasWidthMm,
    canvasHeightMm,

    zIndex,
    importIndex,
  );
}

export function createStickerFromClipboardImage(
  image:
    ClipboardImportableImage,

  canvasWidthMm: number,
  canvasHeightMm: number,

  zIndex: number,
  importIndex: number,
): StickerObject {
  const persistedUri =
    saveClipboardImageToAppStorage(
      image.dataUri,
    );

  return createBaseSticker(
    persistedUri,

    image.width,
    image.height,

    canvasWidthMm,
    canvasHeightMm,

    zIndex,
    importIndex,
  );
}

export async function createStickerFromUrl(
  url: string,

  canvasWidthMm: number,
  canvasHeightMm: number,

  zIndex: number,
  importIndex: number,
): Promise<StickerObject> {
  const downloadedFile =
    await downloadImageToAppStorage(
      url,
    );

  const {
    width,
    height,
  } =
    await getImageDimensions(
      downloadedFile.uri,
    );

  return createBaseSticker(
    downloadedFile.uri,

    width,
    height,

    canvasWidthMm,
    canvasHeightMm,

    zIndex,
    importIndex,
  );
}