export interface CutLineSettings {
  enabled: boolean;

  /**
   * Physical distance between
   * the artwork and cutting path.
   */
  offsetMm: number;
}

export interface StickerObject {
  id: string;

  /**
   * Original image stored on device.
   */
  sourceUri: string;

  /**
   * Optional processed image,
   * such as after background removal.
   */
  processedUri?: string;

  /**
   * Sticker position relative
   * to the physical print canvas.
   */
  xMm: number;
  yMm: number;

  widthMm: number;
  heightMm: number;

  /**
   * Rotation in degrees.
   */
  rotation: number;

  /**
   * Determines front/back order.
   */
  zIndex: number;

  backgroundRemoved: boolean;

  cutLine: CutLineSettings;

  /**
   * Pixel dimensions of the original imported image, captured once
   * at import time regardless of source (Photos / Files / Paste).
   * Used to derive print-quality PPI on demand — see
   * utils/units.ts's calculateSourcePpi(). Optional so projects
   * saved before this field existed still load without a migration.
   */
  originalWidthPx?: number;
  originalHeightPx?: number;

  /**
   * originalWidthPx / originalHeightPx, captured at import time.
   * Not enforced during resize yet, but kept as a stable reference
   * for a future "lock aspect ratio" resize handle.
   */
  aspectRatio?: number;
}