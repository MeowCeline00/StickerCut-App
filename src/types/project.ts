import type { CanvasSettings } from './canvas';
import type { StickerObject } from './sticker';

export interface StickerProject {
  id: string;

  name: string;

  createdAt: number;
  updatedAt: number;

  canvas: CanvasSettings;

  stickers: StickerObject[];

  /**
   * Reference guides dragged out from the rulers — editor-only aids,
   * never rendered in preview.tsx or any future export/print output.
   * Optional/additive so projects saved before guides existed still
   * load with none.
   */
  guides?: Guide[];

  /**
   * Interface theme chosen at project creation (see new-project.tsx).
   * Optional/additive; only "light" is actually implemented right
   * now — see src/constants/themes.ts for the honest status of the
   * other two.
   */
  themeId?: ThemeId;
}

export type ThemeId = "dark" | "light" | "pink";

export interface Guide {
  id: string;

  /**
   * "horizontal" guides run left-to-right across the page (dragged out
   * of the TOP ruler) and are positioned by Y. "vertical" guides run
   * top-to-bottom (dragged out of the LEFT ruler) and are positioned
   * by X.
   */
  axis: "horizontal" | "vertical";

  /** Position along the perpendicular axis, in mm from the page origin. */
  positionMm: number;
}