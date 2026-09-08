// Single source of truth for the editor's ruler/page coordinate system.
//
// The physical canvas content origin (mm=0, mm=0) must line up exactly
// with ruler tick 0 on both axes. To keep that true everywhere, every
// file that lays out rulers, the corner spacer, or the page border reads
// its sizing from these two constants instead of hardcoding its own
// pixel value.
//
// RULER_SIZE_PX is the thickness of both the horizontal and vertical
// ruler strips, and also the size of the corner spacer that sits in the
// top-left of the ruler grid (so the grid's rows/columns line up).
//
// PAGE_BORDER_PX is a purely decorative outline drawn on top of the
// page — see `printCanvas`/`printCanvasBorder` in editor.styles.ts. It
// is rendered as an absolutely-positioned overlay, NOT as a real
// `borderWidth` on the content-holding view, specifically so it never
// insets where children (stickers, guides) render relative to mm=0.
export const RULER_SIZE_PX = 22;
export const PAGE_BORDER_PX = 1;
