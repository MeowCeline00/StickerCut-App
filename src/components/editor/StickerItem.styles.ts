import { StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";

const OVERLAY_INSET = 8;
const RESIZE_HANDLE_VISUAL_SIZE = 12;
const RESIZE_TOUCH_TARGET_SIZE = 40;

// Delete (top-right) / rotate (bottom-right) auxiliary controls.
// Visible size ~22-26px, touch target ~40-44px per spec — these values
// must match the same-named constants in StickerItem.tsx, which uses
// them (plus AUX_CONTROL_OFFSET) to size the interaction root and
// position each control's touch target so it clears the resize
// handles at the same corner.
const AUX_CONTROL_VISIBLE_SIZE = 24;
const AUX_CONTROL_TOUCH_SIZE = 42;

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

  // Shared touch-target wrapper for the delete (×) and rotate (↻)
  // auxiliary controls — same finger-friendly-touch-target-larger-
  // than-visible-icon pattern as resizeTouchTarget, above.
  auxTouchTarget: {
    position: "absolute",
    width: AUX_CONTROL_TOUCH_SIZE,
    height: AUX_CONTROL_TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  // The rotation handle: a small circular control with a clear ↻
  // arrow glyph, sitting at the bottom-right corner of the selection
  // (CRITICAL FIX 6) rather than a plain unlabeled dot above the
  // sticker.
  rotateHandleVisual: {
    width: AUX_CONTROL_VISIBLE_SIZE,
    height: AUX_CONTROL_VISIBLE_SIZE,
    borderRadius: AUX_CONTROL_VISIBLE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.accentBright,
    backgroundColor: Colors.surfaceBright,
    alignItems: "center",
    justifyContent: "center",
  },

  rotateHandleIcon: {
    color: Colors.accentBright,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },

  // The delete control: a small circular control with a clear × glyph
  // in the theme's danger color, sitting at the top-right corner of
  // the selection (CRITICAL FIX: delete UX). Deliberately the same
  // visual weight as the rotate handle so the two auxiliary controls
  // read as a matched pair rather than one standing out.
  deleteControlVisual: {
    width: AUX_CONTROL_VISIBLE_SIZE,
    height: AUX_CONTROL_VISIBLE_SIZE,
    borderRadius: AUX_CONTROL_VISIBLE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: Colors.surfaceBright,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteControlText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 17,
  },
});
