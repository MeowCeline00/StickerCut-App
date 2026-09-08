export type CutLineShape =
  | "tight"
  | "round"
  | "rect";

export interface CutLineSettings {
  enabled: boolean;

  /**
   * Physical gap between artwork and intended cutting path.
   */
  offsetMm: number;

  /**
   * `tight` is still only a future real contour mode.
   */
  shape?: CutLineShape;

  color?: string;
}

export interface StickerObject {
  id: string;

  /**
   * Persistent original artwork.
   */
  sourceUri: string;

  /**
   * Future processed derivative, for example background removal.
   *
   * Original sourceUri should never be overwritten.
   */
  processedUri?: string;

  /**
   * Permanent geometry is stored in physical units.
   */
  xMm: number;

  yMm: number;

  widthMm: number;

  heightMm: number;

  rotation: number;

  zIndex: number;

  backgroundRemoved: boolean;

  cutLine:
    CutLineSettings;

  /**
   * Original imported pixel resolution.
   */
  originalWidthPx?:
    number;

  originalHeightPx?:
    number;

  /**
   * Original width / original height.
   */
  aspectRatio?:
    number;

  /**
   * Defaults to true.
   */
  aspectLocked?:
    boolean;
}