// Shared cut-line geometry types, used identically by the editor's live
// preview (StickerTransformOverlay.tsx) and the production preview
// screen (preview.tsx) — and eventually by export — so the three never
// drift apart into "editor line ≠ preview line ≠ exported line".
//
// This is intentionally a simple BOUNDING-BOX representation (an
// outward-expanded rect, optionally rounded), not a true vector path.
// That's an honest match for what "rect" and "round" cut shapes
// actually are; "tight" (real alpha-contour tracing) is NOT
// represented here yet — see createCutPath.ts.

export type CutBoxShape = "rect" | "round";

/**
 * A cut path expressed as an axis-aligned box relative to the
 * artwork's own (unrotated) top-left corner — i.e. `left`/`top` are
 * negative (the box is larger than, and centered outward from, the
 * artwork). Callers position this box as a sibling/overlay of the
 * artwork and apply the SAME rotation transform the artwork uses, so
 * the cut line rotates together with the sticker.
 */
export interface CutBoxGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
}
