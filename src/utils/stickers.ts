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

// Each additional sticker imported nudges away from dead-center by
// this many mm, in one of four fixed directions (see
// computeImportPositionMm below) — never in the exact same spot as
// the sticker before it, so importing several images in a row never
// hides the earlier ones underneath the newest one.
const IMPORT_OFFSET_MM = 8;

// The three non-center offset directions, applied in this order —
// matching the exact deterministic pattern requested (A: center, B:
// center+8mm/+8mm, C: center-8mm/+8mm, D: center+8mm/-8mm) — and then
// repeated with the offset doubled, tripled, ... for a 5th, 8th, ...
// import. Only importIndex 0 ever lands on dead center; every import
// after that always uses one of these three directions, so a long
// batch never places two stickers in the exact same spot.
const OFFSET_DIRECTIONS: { x: number; y: number }[] = [
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 },
];

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

/**
 * Deterministic, non-colliding placement for the importIndex-th
 * sticker in an import batch: the 1st sticker (importIndex 0) goes
 * dead center, and each one after that is nudged IMPORT_OFFSET_MM in
 * one of four fixed diagonal directions (cycling through
 * OFFSET_DIRECTIONS), so a batch of several imports fans out instead
 * of stacking on top of each other and hiding the earlier ones. Every
 * 4th import (index 4, 8, ...) starts the same four directions over
 * again at double, triple, ... the base offset, so a long batch keeps
 * spreading out rather than repeating the exact same four spots.
 * Result is clamped so the sticker's center-based starting position
 * never places it outside the page.
 */
export function computeImportPositionMm(
  canvasWidthMm: number,
  canvasHeightMm: number,
  stickerWidthMm: number,
  stickerHeightMm: number,
  importIndex: number,
): { xMm: number; yMm: number } {
  const centerX = (canvasWidthMm - stickerWidthMm) / 2;
  const centerY = (canvasHeightMm - stickerHeightMm) / 2;

  let xMm = centerX;
  let yMm = centerY;

  if (importIndex > 0) {
    const cycleIndex = importIndex - 1;
    const ring = Math.floor(cycleIndex / OFFSET_DIRECTIONS.length) + 1;
    const direction = OFFSET_DIRECTIONS[cycleIndex % OFFSET_DIRECTIONS.length];
    const offset = ring * IMPORT_OFFSET_MM;

    xMm = centerX + direction.x * offset;
    yMm = centerY + direction.y * offset;
  }

  const maxX = Math.max(0, canvasWidthMm - stickerWidthMm);
  const maxY = Math.max(0, canvasHeightMm - stickerHeightMm);

  return {
    xMm: Math.min(Math.max(0, xMm), maxX),
    yMm: Math.min(Math.max(0, yMm), maxY),
  };
}
