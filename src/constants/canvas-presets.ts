import type { CanvasPreset } from '@/types/canvas';

export const CANVAS_PRESETS: CanvasPreset[] = [
  {
    id: 'a4',
    name: 'A4',
    widthMm: 210,
    heightMm: 297,
  },

  {
    id: 'a5',
    name: 'A5',
    widthMm: 148,
    heightMm: 210,
  },

  {
    id: 'letter',
    name: 'Letter',
    widthMm: 215.9,
    heightMm: 279.4,
  },

  {
    id: '4x6',
    name: '4 × 6',
    widthMm: 101.6,
    heightMm: 152.4,
  },
];

export function getCanvasPreset(
  id: string
): CanvasPreset | undefined {
  return CANVAS_PRESETS.find(
    preset => preset.id === id
  );
}