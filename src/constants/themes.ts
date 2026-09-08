import type {
  ThemeId,
} from "@/types/project";

export interface ThemeOption {
  id: ThemeId;

  label: string;

  sublabel: string;

  /**
   * Used only by the theme-choice card.
   */
  previewBackground: string;

  previewAccent: string;

  /**
   * Only Light is fully implemented right now.
   *
   * Dark and Pink can remain visible as future options, but they should
   * not pretend to work until styling is driven by a real theme context.
   */
  available: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    label: "Dark",
    sublabel: "blueprint",
    previewBackground: "#050B14",
    previewAccent: "#00A8FF",
    available: false,
  },

  {
    id: "light",
    label: "Light",
    sublabel: "blueprint",
    previewBackground: "#E8F0F8",
    previewAccent: "#0B84E0",
    available: true,
  },

  {
    id: "pink",
    label: "Pink",
    sublabel: "kawaii",
    previewBackground: "#FCE8F0",
    previewAccent: "#E0348C",
    available: false,
  },
];

export const DEFAULT_THEME_ID: ThemeId =
  "light";