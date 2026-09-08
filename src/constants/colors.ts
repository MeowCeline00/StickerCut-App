// Light "blueprint" theme — a light blue-grey workspace with a crisp
// white print page, replacing the previous dark-navy theme. Token
// names are kept identical to the old palette so every consumer
// (BlueprintGrid, StickerItem, screens) picks up the new look with no
// code changes, and so a future LIGHT BLUEPRINT / DARK BLUEPRINT / PINK
// theme switcher can swap this whole object out without touching
// call sites.
export const Colors = {
  background: '#E8F0F8',
  surface: '#F2F7FC',
  surfaceBright: '#FFFFFF',
  ruler: '#DCE8F5',
  border: '#B9CDE3',
  borderBright: '#7FA8D6',
  text: '#0F2A4A',
  textSecondary: '#4A7196',
  textMuted: '#8DA9C4',
  accent: '#0B84E0',
  accentBright: '#12B6E0',
  danger: '#E0344C',
  gridMinor: 'rgba(120, 160, 200, 0.18)',
  gridMajor: 'rgba(90, 140, 190, 0.32)',
  white: '#FFFFFF',
  checkerLight: '#F0F0F0',
  checkerDark: '#D8D8D8',
};
