import { StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";

const HANDLE_SIZE = 10;
const OVERLAY_INSET = 8;

export const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  // Sits slightly outside the sticker's own bounds so the corner
  // handles read as attached to the edge, CAD-style, rather than
  // overlapping the artwork itself.
  selectionOverlay: {
    position: "absolute",
    top: -OVERLAY_INSET,
    left: -OVERLAY_INSET,
    right: -OVERLAY_INSET,
    bottom: -OVERLAY_INSET,
    borderWidth: 1,
    borderColor: Colors.accentBright,
  },

  // Drawn now for the CAD look; drag/resize gestures attach to
  // these in a later phase, so they're non-interactive for now.
  cornerHandle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: Colors.accentBright,
    backgroundColor: Colors.background,
  },

  cornerTopLeft: {
    top: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },

  cornerTopRight: {
    top: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },

  cornerBottomLeft: {
    bottom: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },

  cornerBottomRight: {
    bottom: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },

  // The only corner handle that's actually interactive right now —
  // slightly larger visually than the other three (in addition to
  // its gesture's own hitSlop) so it reads as the "grabbable" one.
  resizeHandle: {
    width: HANDLE_SIZE + 4,
    height: HANDLE_SIZE + 4,
    borderRadius: 3,
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
