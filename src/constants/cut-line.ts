import type { CutLineShape } from '@/types/sticker';

export interface CutShapeOption {
  id: CutLineShape;
  label: string;
  hint: string;
}

// "tight" (real contour tracing around the artwork's alpha channel)
// isn't implemented — no cut-generation algorithm exists yet. It's
// still listed (matching the reference UI) so the option is visible,
// but selecting it falls back to the same rounded-rectangle preview
// as "round", and the Cut Line panel says so explicitly.
export const CUT_SHAPE_OPTIONS: CutShapeOption[] = [
  { id: 'tight', label: 'Tight', hint: 'traces outline' },
  { id: 'round', label: 'Round', hint: 'soft corners' },
  { id: 'rect', label: 'Rect', hint: 'straight box' },
];

export interface CutLineColorSwatch {
  id: string;
  label: string;
  value: string;
}

export const CUT_LINE_COLOR_SWATCHES: CutLineColorSwatch[] = [
  { id: 'cyan', label: 'Cyan', value: '#12B6E0' },
  { id: 'pink', label: 'Pink', value: '#E0348C' },
  { id: 'yellow', label: 'Ylw', value: '#E0C412' },
  { id: 'white', label: 'Wht', value: '#FFFFFF' },
];

export const DEFAULT_CUT_LINE_SHAPE: CutLineShape = 'round';
export const DEFAULT_CUT_LINE_COLOR = CUT_LINE_COLOR_SWATCHES[0].value;
