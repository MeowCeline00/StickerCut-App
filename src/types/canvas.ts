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

  // Fill color used when background === "solid"/"white" and the user has
  // picked a swatch other than plain white. Optional/additive so existing
  // saved projects (with no color chosen) keep working unchanged.
  canvasColor?: string;
}
