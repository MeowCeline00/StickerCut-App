export type CutLineShape = "tight" | "round" | "rect";

export interface CutLineSettings {
  enabled: boolean;

  /**
   * Physical distance between
   * the artwork and cutting path.
   */
  offsetMm: number;

  /**
   * How the cut path is traced around the artwork. "tight" (contour
   * tracing) isn't implemented yet — selecting it currently falls
   * back to the same rounded-rectangle preview as "round", flagged
   * honestly in the UI rather than silently doing nothing. Optional
   * so projects saved before this field existed still load.
   */
  shape?: CutLineShape;

  /** Preview/output color for the cut path. */
  color?: string;
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
   * Enforced during resize when aspectLocked is true (the default).
   */
  aspectRatio?: number;

  /**
   * When false, the four corner handles resize width/height
   * independently instead of preserving aspectRatio. Optional and
   * defaults to true (locked) so existing saved projects keep their
   * old, aspect-locked resize behavior.
   */
  aspectLocked?: boolean;
}
