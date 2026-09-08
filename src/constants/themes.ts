import type { ThemeId } from '@/types/project';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  sublabel: string;
  // Small swatch used only to render this option's own picker card —
  // NOT applied anywhere else. See the "available" note below.
  previewBackground: string;
  previewAccent: string;
  // Only "light" actually restyles the app right now. Choosing this
  // per-project theme requires every screen's styles to read from a
  // live theme context instead of the static Colors singleton in
  // constants/colors.ts — a real but separate refactor. Dark/Pink are
  // shown (matching the reference picker) but are disabled with an
  // honest "coming soon" note rather than silently doing nothing.
  available: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    sublabel: 'blueprint',
    previewBackground: '#050B14',
    previewAccent: '#00A8FF',
    available: false,
  },
  {
    id: 'light',
    label: 'Light',
    sublabel: 'blueprint',
    previewBackground: '#E8F0F8',
    previewAccent: '#0B84E0',
    available: true,
  },
  {
    id: 'pink',
    label: 'Pink',
    sublabel: 'kawaii',
    previewBackground: '#FCE8F0',
    previewAccent: '#E0348C',
    available: false,
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'light';
