import { Text, View } from "react-native";
import Animated, { type useAnimatedStyle } from "react-native-reanimated";
import type { GestureType } from "react-native-gesture-handler";
import { GestureDetector } from "react-native-gesture-handler";

import { DEFAULT_CUT_LINE_COLOR, DEFAULT_CUT_LINE_SHAPE } from "@/constants/cut-line";
import type { StickerObject } from "@/types/sticker";

import { styles } from "./StickerItem.styles";

// Below this, print quality visibly suffers because the source image
// has fewer pixels than the print size needs — see StickerItem.tsx.
const LOW_PPI_WARNING_THRESHOLD = 150;

interface SelectionBadgesProps {
  sticker: StickerObject;
  sourcePpi: number | null;
}

/**
 * The bounding-box border + dimension/rotation/background-status
 * labels, rendered as CHILDREN of StickerItem's visualBox (so they
 * scale/rotate with it). Purely presentational — StickerItem still
 * owns all gesture/geometry state, this just reads the finished
 * values off the sticker prop.
 */
export function SelectionBadges({ sticker, sourcePpi }: SelectionBadgesProps) {
  return (
    <View style={styles.selectionOverlay} pointerEvents="none">
      <View style={styles.dimensionLabel}>
        <Text style={styles.dimensionLabelText}>
          {sticker.widthMm.toFixed(1)} × {sticker.heightMm.toFixed(1)} mm
          {sourcePpi !== null && (
            <Text
              style={sourcePpi < LOW_PPI_WARNING_THRESHOLD ? styles.dimensionLabelWarning : undefined}
            >
              {"  ·  "}
              {Math.round(sourcePpi)} PPI
              {sourcePpi < LOW_PPI_WARNING_THRESHOLD ? " (low)" : ""}
            </Text>
          )}
        </Text>

        <Text style={styles.dimensionLabelText}>{Math.round(sticker.rotation)}°</Text>

        {/* Background removal isn't implemented yet — this always
            reads ORIGINAL BG today. Shown unconditionally, honestly,
            rather than leaving you guessing whether it silently ran. */}
        <Text style={styles.backgroundBadgeText}>
          {sticker.backgroundRemoved ? "BG REMOVED" : "ORIGINAL BG"}
        </Text>
      </View>
    </View>
  );
}

interface CutLinePreviewProps {
  sticker: StickerObject;
}

/**
 * An honest APPROXIMATION of the future cut path — a colored outline
 * in the chosen shape/color, not a real traced contour. Shown instead
 * of SelectionBadges when the Cut Line tab is active for this sticker.
 */
export function CutLinePreview({ sticker }: CutLinePreviewProps) {
  const shape = sticker.cutLine.shape ?? DEFAULT_CUT_LINE_SHAPE;
  const color = sticker.cutLine.color ?? DEFAULT_CUT_LINE_COLOR;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.cutLinePreviewOverlay,
        shape === "rect" ? styles.cutLinePreviewRect : styles.cutLinePreviewRound,
        { borderColor: color },
      ]}
    />
  );
}

interface SelectionHandlesProps {
  width: number;
  height: number;
  resizeTouchTargetMargin: number;
  rotateHandleGap: number;
  halfTouchTarget: number;
  topLeftHandleStyle: ReturnType<typeof useAnimatedStyle>;
  topRightHandleStyle: ReturnType<typeof useAnimatedStyle>;
  bottomLeftHandleStyle: ReturnType<typeof useAnimatedStyle>;
  bottomRightHandleStyle: ReturnType<typeof useAnimatedStyle>;
  rotateHandleStyle: ReturnType<typeof useAnimatedStyle>;
  resizeTopLeftGesture: GestureType;
  resizeTopRightGesture: GestureType;
  resizeBottomLeftGesture: GestureType;
  resizeBottomRightGesture: GestureType;
  rotateGesture: GestureType;
}

/**
 * The four corner resize handles plus the rotation handle — all
 * siblings of StickerItem's visualBox (not children), so their touch
 * targets sit in the sticker's UNROTATED frame. StickerItem owns every
 * gesture and shared value; this component only lays out the already-
 * built GestureDetector/Animated.View tree, so the gesture math in
 * StickerItem.tsx doesn't have to live next to ~90 lines of JSX.
 */
export function SelectionHandles({
  width,
  height,
  resizeTouchTargetMargin,
  rotateHandleGap,
  halfTouchTarget,
  topLeftHandleStyle,
  topRightHandleStyle,
  bottomLeftHandleStyle,
  bottomRightHandleStyle,
  rotateHandleStyle,
  resizeTopLeftGesture,
  resizeTopRightGesture,
  resizeBottomLeftGesture,
  resizeBottomRightGesture,
  rotateGesture,
}: SelectionHandlesProps) {
  return (
    <>
      <GestureDetector gesture={resizeTopLeftGesture}>
        <Animated.View
          style={[
            styles.resizeTouchTarget,
            {
              left: resizeTouchTargetMargin - halfTouchTarget,
              top: resizeTouchTargetMargin + rotateHandleGap - halfTouchTarget,
            },
            topLeftHandleStyle,
          ]}
        >
          <View style={styles.resizeHandleVisual} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={resizeTopRightGesture}>
        <Animated.View
          style={[
            styles.resizeTouchTarget,
            {
              left: resizeTouchTargetMargin + width - halfTouchTarget,
              top: resizeTouchTargetMargin + rotateHandleGap - halfTouchTarget,
            },
            topRightHandleStyle,
          ]}
        >
          <View style={styles.resizeHandleVisual} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={resizeBottomLeftGesture}>
        <Animated.View
          style={[
            styles.resizeTouchTarget,
            {
              left: resizeTouchTargetMargin - halfTouchTarget,
              top: resizeTouchTargetMargin + rotateHandleGap + height - halfTouchTarget,
            },
            bottomLeftHandleStyle,
          ]}
        >
          <View style={styles.resizeHandleVisual} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={resizeBottomRightGesture}>
        <Animated.View
          style={[
            styles.resizeTouchTarget,
            {
              left: resizeTouchTargetMargin + width - halfTouchTarget,
              top: resizeTouchTargetMargin + rotateHandleGap + height - halfTouchTarget,
            },
            bottomRightHandleStyle,
          ]}
        >
          <View style={styles.resizeHandleVisual} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={rotateGesture}>
        <Animated.View
          style={[
            styles.resizeTouchTarget,
            {
              left: resizeTouchTargetMargin + width / 2 - halfTouchTarget,
              top: resizeTouchTargetMargin - halfTouchTarget,
            },
            rotateHandleStyle,
          ]}
        >
          <View style={styles.rotateHandleVisual} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>
    </>
  );
}
