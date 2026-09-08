// Small, curated set of canvas fill colors for the "Solid" background
// mode. Kept centralized here (rather than a full color-picker) so the
// UI stays a compact swatch row per the design spec.
export interface CanvasColorSwatch {
  id: string;
  label: string;
  value: string;
}

export const CANVAS_COLOR_SWATCHES: CanvasColorSwatch[] = [
  { id: 'white', label: 'White', value: '#FFFFFF' },
  { id: 'ivory', label: 'Ivory', value: '#FBF6EC' },
  { id: 'lightGray', label: 'Light Gray', value: '#E4E7EB' },
  { id: 'blush', label: 'Blush', value: '#FBE3E7' },
  { id: 'mint', label: 'Mint', value: '#E1F3EA' },
  { id: 'skyBlue', label: 'Sky Blue', value: '#DCEEFB' },
  { id: 'lemon', label: 'Lemon', value: '#FBF3D6' },
  { id: 'charcoal', label: 'Charcoal', value: '#2B333B' },
];

export const DEFAULT_CANVAS_COLOR = CANVAS_COLOR_SWATCHES[0].value;
