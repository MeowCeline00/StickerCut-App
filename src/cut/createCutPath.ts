import type { CutLineShape } from "@/types/sticker";

import type { CutBoxGeometry } from "./cutPath.types";
import { createRectCutPath } from "./createRectCutPath";
import { createRoundCutPath } from "./createRoundCutPath";

/**
 * Single entry point for cut-line geometry, shared by the editor's
 * live preview and the production preview screen (and, later, export)
 * so all three always compute the exact same box for a given sticker.
 *
 * IMPORTANT: "tight" is not a real alpha-contour trace yet — no
 * contour-tracing/offset-path pipeline exists in this codebase (see
 * src/cut/ eventually gaining contourTrace.ts, offsetPath.ts, etc. for
 * that). Rather than silently drawing a rectangle and calling it
 * "tight", this falls back to the rounded-box approximation and
 * callers are expected to label it as experimental/unavailable in the
 * UI (see the Cut Line panel's "Tight contour tracing is not
 * implemented yet" note in editor.tsx) rather than presenting it as a
 * finished production mode.
 */
export function createCutPath(
  shape: CutLineShape,
  artworkWidthPx: number,
  artworkHeightPx: number,
  offsetPx: number,
): CutBoxGeometry {
  if (shape === "rect") {
    return createRectCutPath(artworkWidthPx, artworkHeightPx, offsetPx);
  }

  // "round" and the not-yet-implemented "tight" both use the rounded
  // approximation for now.
  return createRoundCutPath(artworkWidthPx, artworkHeightPx, offsetPx);
}
