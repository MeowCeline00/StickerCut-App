export const MM_PER_INCH = 25.4;

export function mmToInches(
  mm: number
): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(
  inches: number
): number {
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
  availableHeight: number
): number {
  return Math.min(
    availableWidth / canvasWidthMm,
    availableHeight / canvasHeightMm
  );
}

export function mmToDisplay(
  mm: number,
  scale: number
): number {
  return mm * scale;
}

export function displayToMm(
  displayValue: number,
  scale: number
): number {
  return displayValue / scale;
}