import type {
  ThemeId,
} from "@/types/project";

export interface ThemeOption {
  id: ThemeId;

  label: string;

  sublabel: string;

  /**
   * Used only for the small theme preview card.
   */
  previewBackground: string;

  previewAccent: string;

  /**
   * Only the light theme is actually implemented across the app right now.
   *
   * Dark and Pink remain visible as future options but should not pretend
   * to work until the app uses a real runtime theme provider.
   */
  available: boolean;
}

export const THEME_OPTIONS: ThemeOption[] =
  [
    {
      id:
        "dark",

      label:
        "Dark",

      sublabel:
        "blueprint",

      previewBackground:
        "#050B14",

      previewAccent:
        "#00A8FF",

      available:
        false,
    },

    {
      id:
        "light",

      label:
        "Light",

      sublabel:
        "blueprint",

      previewBackground:
        "#E8F0F8",

      previewAccent:
        "#0B84E0",

      available:
        true,
    },

    {
      id:
        "pink",

      label:
        "Pink",

      sublabel:
        "kawaii",

      previewBackground:
        "#FCE8F0",

      previewAccent:
        "#E0348C",

      available:
        false,
    },
  ];

export const DEFAULT_THEME_ID: ThemeId =
  "light";