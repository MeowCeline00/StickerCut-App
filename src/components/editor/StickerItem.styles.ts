import { StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";

const OVERLAY_INSET = 8;
const RESIZE_HANDLE_VISUAL_SIZE = 12;
const RESIZE_TOUCH_TARGET_SIZE = 40;

export const styles = StyleSheet.create({
  // Purely a layout container: exists to give the resize handles'
  // touch targets real native bounds to be touched within (see the
  // long comment on RESIZE_TOUCH_TARGET_MARGIN in StickerItem.tsx).
  // box-none (set where this is rendered) keeps its own empty padding
  // area from swallowing touches meant for the canvas underneath.
  interactionRoot: {
    position: "absolute",
  },

  // The actual sticker: image, border, and label. Positioned at a
  // fixed offset inside interactionRoot; its live position/size while
  // dragging comes from Reanimated shared values layered on top of
  // this base style.
  visualBox: {
    position: "absolute",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  // Sits slightly outside the sticker's own bounds so the border reads
  // as attached to the edge, CAD-style, rather than overlapping the
  // artwork itself. Purely visual (pointerEvents="none" where used) —
  // the actual corner handles are now separate sibling views, not
  // children of this overlay, so they can have real touch targets.
  selectionOverlay: {
    position: "absolute",
    top: -OVERLAY_INSET,
    left: -OVERLAY_INSET,
    right: -OVERLAY_INSET,
    bottom: -OVERLAY_INSET,
    borderWidth: 1,
    borderColor: Colors.accentBright,
  },

  // One of these renders per corner, sized to a finger-friendly ~40dp
  // even though the visible handle inside it (resizeHandleVisual) is
  // much smaller — see RESIZE_TOUCH_TARGET_SIZE vs
  // RESIZE_HANDLE_VISUAL_SIZE in StickerItem.tsx. Centered content so
  // the small visual square sits in the middle of the larger touch area.
  resizeTouchTarget: {
    position: "absolute",
    width: RESIZE_TOUCH_TARGET_SIZE,
    height: RESIZE_TOUCH_TARGET_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  // The visible CAD handle is intentionally small, but the gesture
  // target (resizeTouchTarget, above) is larger so it remains usable
  // on a touch screen.
  resizeHandleVisual: {
    width: RESIZE_HANDLE_VISUAL_SIZE,
    height: RESIZE_HANDLE_VISUAL_SIZE,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.accentBright,
    backgroundColor: Colors.accentBright,
  },

  // Compact readout positioned just outside the selection box's top
  // edge (CRITICAL FIX 5) — small enough, and far enough outside the
  // artwork bounds, that it never covers the sticker's own content,
  // even when the sticker itself is small.
  dimensionLabel: {
    position: "absolute",
    top: -20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  dimensionLabelText: {
    color: Colors.accentBright,
    fontSize: 9,
    fontWeight: "700",
    backgroundColor: Colors.background,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: "hidden",
  },

  // Tiny secondary indicator, only shown when the sticker is actually
  // rotated — muted so it doesn't compete with the size readout.
  rotationLabelText: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: "600",
    backgroundColor: Colors.background,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: "hidden",
  },

  // The rotation handle: a small filled circle, visually distinct
  // from the square corner-resize handles.
  rotateHandleVisual: {
    width: RESIZE_HANDLE_VISUAL_SIZE,
    height: RESIZE_HANDLE_VISUAL_SIZE,
    borderRadius: RESIZE_HANDLE_VISUAL_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.accentBright,
    backgroundColor: Colors.surfaceBright,
  },

  // Cut Line tab preview: an honest APPROXIMATION of the future cut
  // path (a colored outline around the sticker's bounding box), not a
  // real traced contour — see the "tight" shape's comment in
  // constants/cut-line.ts.
  cutLinePreviewOverlay: {
    position: "absolute",
    top: -OVERLAY_INSET,
    left: -OVERLAY_INSET,
    right: -OVERLAY_INSET,
    bottom: -OVERLAY_INSET,
    borderWidth: 2,
    borderStyle: "dashed",
  },

  cutLinePreviewRound: {
    borderRadius: 16,
  },

  cutLinePreviewRect: {
    borderRadius: 0,
  },
});
