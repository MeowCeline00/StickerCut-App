import type { CutBoxGeometry } from "./cutPath.types";
import { createRectCutPath } from "./createRectCutPath";

// Base corner radius (display px) before the offset is added — chosen
// to read as "softly rounded" at typical editor zoom levels without
// needing to know the sticker's actual size.
const BASE_CORNER_RADIUS_PX = 14;

/**
 * Same outward expansion as the rect cut path, with rounded corners.
 * The radius grows with the offset so a larger gap still reads as a
 * consistent, proportionate rounding rather than a fixed radius that
 * looks tiny on a big expansion.
 */
export function createRoundCutPath(
  artworkWidthPx: number,
  artworkHeightPx: number,
  offsetPx: number,
): CutBoxGeometry {
  const rect = createRectCutPath(artworkWidthPx, artworkHeightPx, offsetPx);

  return {
    ...rect,
    borderRadius: BASE_CORNER_RADIUS_PX + offsetPx,
  };
}
