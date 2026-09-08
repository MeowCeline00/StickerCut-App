import type { CutBoxGeometry } from "./cutPath.types";

/**
 * Rectangular cut path: the artwork's own bounding box, expanded
 * outward by `offsetPx` on every side.
 *
 *   left   = -offsetPx
 *   top    = -offsetPx
 *   width  = artworkWidthPx + offsetPx * 2
 *   height = artworkHeightPx + offsetPx * 2
 */
export function createRectCutPath(
  artworkWidthPx: number,
  artworkHeightPx: number,
  offsetPx: number,
): CutBoxGeometry {
  return {
    left: -offsetPx,
    top: -offsetPx,
    width: artworkWidthPx + offsetPx * 2,
    height: artworkHeightPx + offsetPx * 2,
    borderRadius: 0,
  };
}
