import type { CanvasSettings } from './canvas';
import type { StickerObject } from './sticker';

export interface StickerProject {
  id: string;

  name: string;

  createdAt: number;
  updatedAt: number;

  canvas: CanvasSettings;

  stickers: StickerObject[];
}