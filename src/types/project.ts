import type {
  CanvasSettings,
} from "./canvas";

import type {
  StickerObject,
} from "./sticker";

export type ThemeId =
  | "dark"
  | "light"
  | "pink";

export interface CanvasGuide {
  id: string;

  /**
   * horizontal:
   * runs from left → right and stores its Y position.
   *
   * vertical:
   * runs from top → bottom and stores its X position.
   */
  axis:
    | "horizontal"
    | "vertical";

  /**
   * Position from the printable page's 0/0 origin.
   *
   * Always stored in millimeters.
   */
  positionMm: number;
}

export interface StickerProject {
  id: string;

  name: string;

  createdAt: number;

  updatedAt: number;

  canvas:
    CanvasSettings;

  stickers:
    StickerObject[];

  /**
   * Editor-only.
   *
   * Preview/print/export must not render these.
   */
  guides?:
    CanvasGuide[];

  themeId?:
    ThemeId;
}