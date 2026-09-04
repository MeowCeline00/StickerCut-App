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
}