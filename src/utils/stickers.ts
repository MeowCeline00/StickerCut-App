import type { StickerObject } from "@/types/sticker";

// New stickers default to this size on their longer side; the
// shorter side is scaled to preserve the source image's aspect
// ratio. This is just a starting size — the user can resize freely
// afterward via the corner handle.
const DEFAULT_STICKER_MAX_MM = 40;

// A resize can never shrink a sticker below this on either side —
// without a floor, dragging the corner handle past the sticker's
// own position could flip its width/height negative.
export const MIN_STICKER_MM = 5;

// Each additional sticker imported in the same batch is nudged
// this many mm further from center so a multi-image import
// doesn't stack every sticker in an identical spot.
const IMPORT_OFFSET_MM = 6;

export function computeDefaultStickerSizeMm(
  naturalWidth: number,
  naturalHeight: number,
): { widthMm: number; heightMm: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { widthMm: DEFAULT_STICKER_MAX_MM, heightMm: DEFAULT_STICKER_MAX_MM };
  }

  if (naturalWidth >= naturalHeight) {
    return {
      widthMm: DEFAULT_STICKER_MAX_MM,
      heightMm: (naturalHeight / naturalWidth) * DEFAULT_STICKER_MAX_MM,
    };
  }

  return {
    widthMm: (naturalWidth / naturalHeight) * DEFAULT_STICKER_MAX_MM,
    heightMm: DEFAULT_STICKER_MAX_MM,
  };
}

/**
 * zIndex determines front/back layer order. New stickers always
 * land on top, so the next value is one more than the current
 * highest — never reused, even after deletes, which keeps layer
 * ordering stable and simple (see LAYERS in a later phase).
 */
export function getNextZIndex(stickers: StickerObject[]): number {
  if (stickers.length === 0) {
    return 0;
  }

  return Math.max(...stickers.map((sticker) => sticker.zIndex)) + 1;
}

export function computeImportPositionMm(
  canvasWidthMm: number,
  canvasHeightMm: number,
  stickerWidthMm: number,
  stickerHeightMm: number,
  importIndex: number,
): { xMm: number; yMm: number } {
  const centerX = (canvasWidthMm - stickerWidthMm) / 2;
  const centerY = (canvasHeightMm - stickerHeightMm) / 2;
  const offset = importIndex * IMPORT_OFFSET_MM;

  return {
    xMm: centerX + offset,
    yMm: centerY + offset,
  };
}
