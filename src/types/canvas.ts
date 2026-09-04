export type CanvasBackground = "white" | "transparent";

export type CanvasOrientation = "portrait" | "landscape";

export interface CanvasPreset {
  id: string;
  name: string;

  widthMm: number;
  heightMm: number;
}

export interface CanvasSettings {
  presetId: string;

  widthMm: number;
  heightMm: number;

  orientation: CanvasOrientation;

  background: CanvasBackground;
}
