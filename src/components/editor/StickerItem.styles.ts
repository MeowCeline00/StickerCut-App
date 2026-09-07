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

  dimensionLabel: {
    position: "absolute",
    bottom: -30,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 3,
  },

  dimensionLabelText: {
    color: Colors.accentBright,
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },

  // Flags a sticker whose source image is being stretched past a
  // print-safe resolution (see LOW_PPI_WARNING_THRESHOLD).
  dimensionLabelWarning: {
    color: Colors.danger,
  },

  // Honest, always-visible readout of whether background removal
  // has actually run on this sticker (it hasn't, yet — see the
  // phase report). Muted on purpose so it doesn't compete with the
  // dimension/PPI readout above it.
  backgroundBadgeText: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "600",
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
});
