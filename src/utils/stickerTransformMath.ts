// Pure geometry helpers shared by StickerItem's move/resize/rotate
// gestures. Split out of StickerItem.tsx so the component file is
// about rendering and gesture wiring, not math — this file has no
// React/Reanimated dependency other than the "worklet" directive
// resize needs to run on the UI thread.

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export interface CornerResizeResult {
  deltaLeft: number;
  deltaTop: number;
  deltaWidth: number;
  deltaHeight: number;
}

/**
 * Given one corner's raw finger movement (in display px), returns how much
 * the sticker's box should change — as deltas from its current committed
 * box — to resize from that corner while keeping the OPPOSITE corner
 * anchored. When aspectLocked is true the image's aspect ratio is
 * preserved: dragging is reduced to a single scale factor, taken from
 * whichever axis (width or height) the finger actually moved further
 * along proportionally. When false, width and height change
 * independently from the raw dx/dy.
 *
 * This is a plain (worklet) function, not a hook, so all four corners
 * can share one implementation instead of four near-duplicates, and so
 * it can run on the UI thread during a live drag.
 */
export function computeCornerResizeDelta(
  corner: Corner,
  dx: number,
  dy: number,
  committedWidth: number,
  committedHeight: number,
  aspectRatio: number,
  minSizePx: number,
  aspectLocked: boolean,
): CornerResizeResult {
  "worklet";

  // A stationary "tap" on the handle (no movement at all) must resize
  // nothing. Without this early exit, floating-point rounding between
  // the stored aspectRatio and the sticker's actual current width/height
  // ratio could otherwise nudge the size by a hair on every tap.
  if (dx === 0 && dy === 0) {
    return { deltaLeft: 0, deltaTop: 0, deltaWidth: 0, deltaHeight: 0 };
  }

  let rawWidth = committedWidth;
  let rawHeight = committedHeight;

  if (corner === "bottomRight") {
    rawWidth = committedWidth + dx;
    rawHeight = committedHeight + dy;
  } else if (corner === "bottomLeft") {
    rawWidth = committedWidth - dx;
    rawHeight = committedHeight + dy;
  } else if (corner === "topRight") {
    rawWidth = committedWidth + dx;
    rawHeight = committedHeight - dy;
  } else {
    rawWidth = committedWidth - dx;
    rawHeight = committedHeight - dy;
  }

  let newWidth: number;
  let newHeight: number;

  if (aspectLocked) {
    // Whichever axis moved further, proportionally, drives the resize;
    // the other dimension is derived from it via the locked aspect ratio.
    const widthRatio = Math.abs(rawWidth - committedWidth) / committedWidth;
    const heightRatio = Math.abs(rawHeight - committedHeight) / committedHeight;

    if (widthRatio >= heightRatio) {
      newWidth = rawWidth;
      newHeight = newWidth / aspectRatio;
    } else {
      newHeight = rawHeight;
      newWidth = newHeight * aspectRatio;
    }
  } else {
    // Free resize: width and height change independently.
    newWidth = rawWidth;
    newHeight = rawHeight;
  }

  // MIN_STICKER_MM floor (as minSizePx, already converted by the
  // caller), applied without breaking the aspect ratio when locked;
  // independently per axis when free.
  if (aspectLocked) {
    if (newWidth < minSizePx) {
      newWidth = minSizePx;
      newHeight = minSizePx / aspectRatio;
    }
    if (newHeight < minSizePx) {
      newHeight = minSizePx;
      newWidth = minSizePx * aspectRatio;
    }
  } else {
    newWidth = Math.max(minSizePx, newWidth);
    newHeight = Math.max(minSizePx, newHeight);
  }

  const deltaWidth = newWidth - committedWidth;
  const deltaHeight = newHeight - committedHeight;

  // Corner resizing keeps the opposite corner anchored: only the two
  // corners whose OWN edge is left (topLeft/bottomLeft) or top
  // (topLeft/topRight) shift the box's position — the other edges stay
  // put, which is what "anchored" means here. Because the project model
  // is xMm/yMm/widthMm/heightMm (not screen pixels), the caller converts
  // deltaLeft/deltaTop into deltaXMm/deltaYMm the same way it converts
  // deltaWidth/deltaHeight.
  const deltaLeft = corner === "topLeft" || corner === "bottomLeft" ? -deltaWidth : 0;
  const deltaTop = corner === "topLeft" || corner === "topRight" ? -deltaHeight : 0;

  return { deltaLeft, deltaTop, deltaWidth, deltaHeight };
}

/**
 * Given the rotation handle's cumulative drag translation (in display
 * px, from the gesture's own event.translationX/Y — i.e. always
 * relative to where the drag STARTED, not per-frame deltas) and the
 * handle's rest vector from the sticker's center (in the unrotated
 * frame — always straight up: (0, -(height/2 + ROTATE_HANDLE_GAP))),
 * returns how many degrees the sticker has been rotated so far.
 *
 * The math: the rest vector plus the drag translation gives the
 * handle's CURRENT vector from center; the signed angle between that
 * and the rest vector (via atan2) is the rotation delta. This is a
 * plain (worklet) function — extracted out of StickerItem.tsx per
 * CRITICAL FIX 3, alongside the resize math above, so all of this
 * component's transform geometry lives in one place — reused by both
 * the live per-frame preview (onUpdate) and would be reused by any
 * future non-gesture caller needing the same angle math.
 */
export function computeRotationDeltaDegrees(
  translationX: number,
  translationY: number,
  restVectorX: number,
  restVectorY: number,
): number {
  "worklet";

  const restAngle = Math.atan2(restVectorY, restVectorX);
  const currentVectorX = restVectorX + translationX;
  const currentVectorY = restVectorY + translationY;
  const currentAngle = Math.atan2(currentVectorY, currentVectorX);
  const deltaRad = currentAngle - restAngle;

  return (deltaRad * 180) / Math.PI;
}

/**
 * Clamps a sticker's committed position (NOT size) so it stays fully
 * inside the page: xMm/yMm >= 0, and xMm+widthMm / yMm+heightMm never
 * exceed the canvas size. Used after a move or resize commits.
 *
 * KNOWN LIMITATION: this clamps the sticker's unrotated bounding box.
 * For a rotated sticker, the box that's actually clamped is the
 * axis-aligned widthMm/heightMm rectangle, not the true rotated
 * silhouette — a rotated sticker can still visually poke past the page
 * edge before this clamp kicks in. Precise rotated-bounds clamping
 * needs the sticker's rotated corner coordinates, which is meaningfully
 * more math for a rare edge case; this basic approximation is called
 * out explicitly rather than silently shipped as if it were exact.
 */
export function clampStickerPositionMm(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  canvasWidthMm: number,
  canvasHeightMm: number,
): { xMm: number; yMm: number } {
  const maxX = Math.max(0, canvasWidthMm - widthMm);
  const maxY = Math.max(0, canvasHeightMm - heightMm);

  return {
    xMm: Math.min(Math.max(0, xMm), maxX),
    yMm: Math.min(Math.max(0, yMm), maxY),
  };
}
