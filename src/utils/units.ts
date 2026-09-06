export const MM_PER_INCH = 25.4;

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

/**
 * Determines how much the real-world
 * canvas must be scaled down to fit
 * inside the phone editor.
 */
export function calculateEditorScale(
  canvasWidthMm: number,
  canvasHeightMm: number,
  availableWidth: number,
  availableHeight: number,
): number {
  return Math.min(
    availableWidth / canvasWidthMm,
    availableHeight / canvasHeightMm,
  );
}

export function mmToDisplay(mm: number, scale: number): number {
  return mm * scale;
}

export function displayToMm(displayValue: number, scale: number): number {
  return displayValue / scale;
}

/**
 * Pixels-per-inch a sticker will actually print at, given the
 * source image's pixel width and the physical width it currently
 * occupies on the canvas. This is computed on demand from values
 * already stored (StickerObject.originalWidthPx and widthMm)
 * rather than cached, so it automatically stays correct after the
 * sticker is resized — there is nothing to go stale.
 *
 * Returns null when there isn't enough information yet (e.g. an
 * older saved sticker with no recorded source pixel width).
 */
export function calculateSourcePpi(
  sourceWidthPx: number | undefined,
  printedWidthMm: number,
): number | null {
  if (!sourceWidthPx || sourceWidthPx <= 0 || printedWidthMm <= 0) {
    return null;
  }

  return sourceWidthPx / mmToInches(printedWidthMm);
}