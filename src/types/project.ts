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
   * Interface theme chosen at project creation (see new-project.tsx).
   * Optional/additive; only "light" is actually implemented right
   * now — see src/constants/themes.ts for the honest status of the
   * other two.
   */
  themeId?: ThemeId;
}

export type ThemeId = "dark" | "light" | "pink";