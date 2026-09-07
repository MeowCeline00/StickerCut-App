import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import type { StickerObject } from "@/types/sticker";
import { MIN_STICKER_MM } from "@/utils/stickers";
import { calculateSourcePpi, mmToDisplay } from "@/utils/units";

import { styles } from "./StickerItem.styles";

// Below this, print quality visibly suffers because the source
// image has fewer pixels than the print size needs. This is a
// starting heuristic (typical home/label printers resolve
// somewhere around 150-300 PPI), not a hard technical limit.
const LOW_PPI_WARNING_THRESHOLD = 150;

// The visible CAD handle is intentionally small, but the gesture target is
// larger so it remains usable on a touch screen (see
// StickerItem.styles.ts for the visible handle's own, smaller size).
const RESIZE_TOUCH_TARGET_SIZE = 40;

// interactionRoot (the outer, non-animated wrapper) has to physically
// extend at least this far past the sticker's own visual box on every
// side, so that a touch landing on a corner handle's touch target lands
// within an ancestor's real native layout bounds. Without this margin,
// the handle is drawn outside its parent's box (fine visually — React
// Native doesn't clip by default) but Android's touch dispatch only
// descends into children whose bounds contain the touch point, so a
// handle sitting entirely outside its parent's box can be seen but
// never receives the initial touch-down that would start a gesture.
// (hitSlop alone can't fix this: hitSlop only widens recognition for
// touches an ancestor already delivered — it can't make an ancestor
// deliver a touch that landed outside its own bounds in the first
// place.) A little more than exactly half the touch target's size is
// kept as a safety margin against rounding.
const RESIZE_TOUCH_TARGET_MARGIN = RESIZE_TOUCH_TARGET_SIZE / 2 + 2;

type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

/**
 * Given one corner's raw finger movement (in display px), returns how much
 * the sticker's box should change — as deltas from its current committed
 * box — to resize from that corner while keeping the OPPOSITE corner
 * anchored and the image's aspect ratio locked (Phase 4/5 of the resize
 * fix). Dragging is reduced to a single scale factor, taken from whichever
 * axis (width or height) the finger actually moved further along
 * proportionally — that's what "the corner drag should calculate one
 * scale factor" means in practice: two independent deltaX/deltaY inputs
 * collapse into one number the box actually resizes by.
 *
 * This is a plain (worklet) function, not a hook, so all four corners
 * can share one implementation instead of four near-duplicates.
 */
function computeCornerResizeDelta(
  corner: Corner,
  dx: number,
  dy: number,
  committedWidth: number,
  committedHeight: number,
  aspectRatio: number,
  minSizePx: number,
): { deltaLeft: number; deltaTop: number; deltaWidth: number; deltaHeight: number } {
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

  // Whichever axis moved further, proportionally, drives the resize; the
  // other dimension is derived from it via the locked aspect ratio.
  const widthRatio = Math.abs(rawWidth - committedWidth) / committedWidth;
  const heightRatio = Math.abs(rawHeight - committedHeight) / committedHeight;

  let newWidth: number;
  let newHeight: number;

  if (widthRatio >= heightRatio) {
    newWidth = rawWidth;
    newHeight = newWidth / aspectRatio;
  } else {
    newHeight = rawHeight;
    newWidth = newHeight * aspectRatio;
  }

  // MIN_STICKER_MM floor, applied without breaking the aspect ratio.
  if (newWidth < minSizePx) {
    newWidth = minSizePx;
    newHeight = minSizePx / aspectRatio;
  }
  if (newHeight < minSizePx) {
    newHeight = minSizePx;
    newWidth = minSizePx * aspectRatio;
  }

  const deltaWidth = newWidth - committedWidth;
  const deltaHeight = newHeight - committedHeight;

  // Corner resizing keeps the opposite corner anchored: only the two
  // corners whose OWN edge is left (topLeft/bottomLeft) or top
  // (topLeft/topRight) shift the box's position — the other edges stay
  // put, which is what "anchored" means here. Because the project model
  // is xMm/yMm/widthMm/heightMm (not screen pixels), the caller converts
  // deltaLeft/deltaTop into deltaXMm/deltaYMm the same way it converts
  // deltaWidth/deltaHeight — see onResize below.
  const deltaLeft = corner === "topLeft" || corner === "bottomLeft" ? -deltaWidth : 0;
  const deltaTop = corner === "topLeft" || corner === "topRight" ? -deltaHeight : 0;

  return { deltaLeft, deltaTop, deltaWidth, deltaHeight };
}

interface StickerItemProps {
  sticker: StickerObject;
  // px-per-mm scale from the parent editor, shared by every
  // sticker so they all convert their mm geometry the same way.
  editorScale: number;
  selected: boolean;
  onSelect: (id: string) => void;
  // Called once, when a drag finishes, with the physical distance
  // moved in mm — not on every frame. The editor screen owns
  // project state, so it applies the delta to the sticker's stored
  // xMm/yMm and autosaves; this component never mutates geometry
  // itself, it only reports what the user's finger did.
  onMove: (id: string, deltaXMm: number, deltaYMm: number) => void;
  // Same pattern as onMove, but for a corner resize handle: reports
  // the physical size change AND, for a top/left-anchored corner,
  // the accompanying position change (deltaXMm/deltaYMm), once the
  // drag ends.
  onResize: (
    id: string,
    deltaWidthMm: number,
    deltaHeightMm: number,
    deltaXMm: number,
    deltaYMm: number,
  ) => void;
}

/**
 * Renders one sticker on the editor canvas. Permanent geometry
 * (xMm/yMm/widthMm/heightMm/rotation) lives in millimeters on the
 * StickerObject — this component only converts to on-screen pixels
 * for display, so print output never depends on any particular
 * phone's screen size. Project dimensions remain in millimeters;
 * display pixels exist only for interaction/rendering.
 *
 * Layout is three nested layers, from outside in:
 *  - interactionRoot: a plain, non-animated View sized to the
 *    sticker's committed box PLUS RESIZE_TOUCH_TARGET_MARGIN on every
 *    side. It exists solely so a corner handle's touch target has
 *    real native bounds to be touched within — see the comment on
 *    RESIZE_TOUCH_TARGET_MARGIN for why that's necessary on Android.
 *  - visualBox: the actual sticker — image, selection border, and
 *    dimension label — positioned at a fixed (RESIZE_TOUCH_TARGET_MARGIN,
 *    RESIZE_TOUCH_TARGET_MARGIN) offset inside interactionRoot. Its
 *    live position/size while dragging comes from Reanimated shared
 *    values (see below); its resting position/size comes straight
 *    from the committed sticker prop.
 *  - four corner touch targets, siblings of visualBox: each one owns
 *    a single Pan gesture for resizing from that corner. Rendering
 *    them AFTER visualBox in JSX (so they stack on top of it) is what
 *    keeps a touch that lands in a corner's small overlap zone from
 *    also being claimed by visualBox's own move gesture underneath —
 *    a "separated gesture region" rather than an explicit
 *    Gesture.Exclusive relationship, since the two never need to
 *    negotiate over the same touch in the first place.
 *
 * Resize geometry is previewed on the UI thread and committed to
 * project geometry only when the gesture ends — the *live* drag
 * position/size only ever exists in Reanimated shared values here;
 * the *committed* position/size stays in StickerObject and is only
 * updated once, via onMove/onResize, when the finger lifts. That
 * split is why every shared value resets to 0 right after calling
 * onMove/onResize — the next render already reflects the new
 * committed geometry.
 */
export function StickerItem({
  sticker,
  editorScale,
  selected,
  onSelect,
  onMove,
  onResize,
}: StickerItemProps) {
  const left = mmToDisplay(sticker.xMm, editorScale);
  const top = mmToDisplay(sticker.yMm, editorScale);
  const width = mmToDisplay(sticker.widthMm, editorScale);
  const height = mmToDisplay(sticker.heightMm, editorScale);
  const minSizePx = mmToDisplay(MIN_STICKER_MM, editorScale);

  // Falls back to the committed width/height ratio for stickers saved
  // before aspectRatio existed on the type, so old projects still
  // resize sensibly instead of crashing on a missing value.
  const aspectRatio = sticker.aspectRatio ?? (sticker.widthMm / sticker.heightMm || 1);

  const outerLeft = left - RESIZE_TOUCH_TARGET_MARGIN;
  const outerTop = top - RESIZE_TOUCH_TARGET_MARGIN;
  const outerWidth = width + RESIZE_TOUCH_TARGET_MARGIN * 2;
  const outerHeight = height + RESIZE_TOUCH_TARGET_MARGIN * 2;

  // processedUri (e.g. after background removal) is preferred for
  // display, but sourceUri is never overwritten — see BACKGROUND
  // REMOVAL note on the badge below.
  const imageUri = sticker.processedUri ?? sticker.sourceUri;

  // Derived on demand from stored geometry rather than cached on
  // the sticker, so it's automatically correct after a resize —
  // see utils/units.ts's calculateSourcePpi for why.
  const sourcePpi = calculateSourcePpi(sticker.originalWidthPx, sticker.widthMm);

  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  // One (dx, dy) pair per corner, each only ever driven by that
  // corner's own gesture. Kept separate (rather than one shared pair
  // for all four) so two corners' math can never cross-contaminate,
  // and so each handle's own visual position can track just its own
  // drag without touching the others.
  const resizeTopLeftDX = useSharedValue(0);
  const resizeTopLeftDY = useSharedValue(0);
  const resizeTopRightDX = useSharedValue(0);
  const resizeTopRightDY = useSharedValue(0);
  const resizeBottomLeftDX = useSharedValue(0);
  const resizeBottomLeftDY = useSharedValue(0);
  const resizeBottomRightDX = useSharedValue(0);
  const resizeBottomRightDY = useSharedValue(0);

  // A tap always selects. A drag only moves the sticker once it's
  // already selected — Gesture.Race lets a quick, still tap win
  // immediately, while a finger that moves past the Pan gesture's
  // own activation distance hands the gesture to Pan instead. That
  // is what stops "tap to select" and "drag to move" from fighting
  // over the same touch.
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(sticker.id);
  });

  const panGesture = Gesture.Pan()
    .enabled(selected)
    .onChange((event) => {
      dragTranslateX.value += event.changeX;
      dragTranslateY.value += event.changeY;
    })
    .onEnd(() => {
      const deltaXMm = dragTranslateX.value / editorScale;
      const deltaYMm = dragTranslateY.value / editorScale;
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      runOnJS(onMove)(sticker.id, deltaXMm, deltaYMm);
    });

  const moveGesture = Gesture.Race(tapGesture, panGesture);

  // Every corner's gesture follows the same shape: accumulate the raw
  // finger movement, then on release run it through
  // computeCornerResizeDelta to get the aspect-ratio-correct,
  // anchor-aware result, convert that from display px to mm, report it,
  // and reset back to 0 (the next render's "committed" width/height/
  // xMm/yMm already includes what was just committed).
  const resizeTopLeftGesture = Gesture.Pan()
    .onChange((event) => {
      resizeTopLeftDX.value += event.changeX;
      resizeTopLeftDY.value += event.changeY;
    })
    .onEnd(() => {
      const result = computeCornerResizeDelta(
        "topLeft",
        resizeTopLeftDX.value,
        resizeTopLeftDY.value,
        width,
        height,
        aspectRatio,
        minSizePx,
      );
      resizeTopLeftDX.value = 0;
      resizeTopLeftDY.value = 0;
      runOnJS(onResize)(
        sticker.id,
        result.deltaWidth / editorScale,
        result.deltaHeight / editorScale,
        result.deltaLeft / editorScale,
        result.deltaTop / editorScale,
      );
    });

  const resizeTopRightGesture = Gesture.Pan()
    .onChange((event) => {
      resizeTopRightDX.value += event.changeX;
      resizeTopRightDY.value += event.changeY;
    })
    .onEnd(() => {
      const result = computeCornerResizeDelta(
        "topRight",
        resizeTopRightDX.value,
        resizeTopRightDY.value,
        width,
        height,
        aspectRatio,
        minSizePx,
      );
      resizeTopRightDX.value = 0;
      resizeTopRightDY.value = 0;
      runOnJS(onResize)(
        sticker.id,
        result.deltaWidth / editorScale,
        result.deltaHeight / editorScale,
        result.deltaLeft / editorScale,
        result.deltaTop / editorScale,
      );
    });

  const resizeBottomLeftGesture = Gesture.Pan()
    .onChange((event) => {
      resizeBottomLeftDX.value += event.changeX;
      resizeBottomLeftDY.value += event.changeY;
    })
    .onEnd(() => {
      const result = computeCornerResizeDelta(
        "bottomLeft",
        resizeBottomLeftDX.value,
        resizeBottomLeftDY.value,
        width,
        height,
        aspectRatio,
        minSizePx,
      );
      resizeBottomLeftDX.value = 0;
      resizeBottomLeftDY.value = 0;
      runOnJS(onResize)(
        sticker.id,
        result.deltaWidth / editorScale,
        result.deltaHeight / editorScale,
        result.deltaLeft / editorScale,
        result.deltaTop / editorScale,
      );
    });

  const resizeBottomRightGesture = Gesture.Pan()
    .onChange((event) => {
      resizeBottomRightDX.value += event.changeX;
      resizeBottomRightDY.value += event.changeY;
    })
    .onEnd(() => {
      const result = computeCornerResizeDelta(
        "bottomRight",
        resizeBottomRightDX.value,
        resizeBottomRightDY.value,
        width,
        height,
        aspectRatio,
        minSizePx,
      );
      resizeBottomRightDX.value = 0;
      resizeBottomRightDY.value = 0;
      runOnJS(onResize)(
        sticker.id,
        result.deltaWidth / editorScale,
        result.deltaHeight / editorScale,
        result.deltaLeft / editorScale,
        result.deltaTop / editorScale,
      );
    });

  // visualBox's live style: sums all four corners' (mostly-zero — only
  // the one actually being dragged ever contributes anything)
  // deltas together with the move gesture's translation. Summing is
  // safe specifically because only one corner can ever be mid-drag at
  // a time (each owns its own separate touch target/gesture), so the
  // other three always contribute an exact zero here.
  const animatedVisualBoxStyle = useAnimatedStyle(() => {
    const topLeftResult = computeCornerResizeDelta(
      "topLeft",
      resizeTopLeftDX.value,
      resizeTopLeftDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
    );
    const topRightResult = computeCornerResizeDelta(
      "topRight",
      resizeTopRightDX.value,
      resizeTopRightDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
    );
    const bottomLeftResult = computeCornerResizeDelta(
      "bottomLeft",
      resizeBottomLeftDX.value,
      resizeBottomLeftDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
    );
    const bottomRightResult = computeCornerResizeDelta(
      "bottomRight",
      resizeBottomRightDX.value,
      resizeBottomRightDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
    );

    const totalDeltaLeft =
      topLeftResult.deltaLeft +
      topRightResult.deltaLeft +
      bottomLeftResult.deltaLeft +
      bottomRightResult.deltaLeft;
    const totalDeltaTop =
      topLeftResult.deltaTop + topRightResult.deltaTop + bottomLeftResult.deltaTop + bottomRightResult.deltaTop;
    const totalDeltaWidth =
      topLeftResult.deltaWidth +
      topRightResult.deltaWidth +
      bottomLeftResult.deltaWidth +
      bottomRightResult.deltaWidth;
    const totalDeltaHeight =
      topLeftResult.deltaHeight +
      topRightResult.deltaHeight +
      bottomLeftResult.deltaHeight +
      bottomRightResult.deltaHeight;

    return {
      transform: [
        { translateX: dragTranslateX.value + totalDeltaLeft },
        { translateY: dragTranslateY.value + totalDeltaTop },
        { rotate: `${sticker.rotation}deg` },
      ],
      width: width + totalDeltaWidth,
      height: height + totalDeltaHeight,
    };
  });

  // Each handle tracks the whole-sticker move (so all four stay
  // attached to the box while it's being dragged) plus its OWN
  // resize drag only — not the aspect-ratio-derived box change, just
  // the raw finger movement, so the handle visually stays under the
  // finger. The other three handles intentionally do not animate
  // live during a resize; they snap to their correct new corner once
  // the gesture ends and the component re-renders from the new
  // committed geometry. Animating all four correctly (two of them
  // only move along one axis, following the locked aspect ratio)
  // would need meaningfully more code for a purely cosmetic gain.
  const topLeftHandleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragTranslateX.value + resizeTopLeftDX.value },
      { translateY: dragTranslateY.value + resizeTopLeftDY.value },
    ],
  }));
  const topRightHandleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragTranslateX.value + resizeTopRightDX.value },
      { translateY: dragTranslateY.value + resizeTopRightDY.value },
    ],
  }));
  const bottomLeftHandleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragTranslateX.value + resizeBottomLeftDX.value },
      { translateY: dragTranslateY.value + resizeBottomLeftDY.value },
    ],
  }));
  const bottomRightHandleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragTranslateX.value + resizeBottomRightDX.value },
      { translateY: dragTranslateY.value + resizeBottomRightDY.value },
    ],
  }));

  const halfTouchTarget = RESIZE_TOUCH_TARGET_SIZE / 2;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.interactionRoot,
        { left: outerLeft, top: outerTop, width: outerWidth, height: outerHeight, zIndex: sticker.zIndex },
      ]}
    >
      <GestureDetector gesture={moveGesture}>
        <Animated.View
          style={[
            styles.visualBox,
            { left: RESIZE_TOUCH_TARGET_MARGIN, top: RESIZE_TOUCH_TARGET_MARGIN, width, height },
            animatedVisualBoxStyle,
          ]}
        >
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />

          {selected && (
            <View style={styles.selectionOverlay} pointerEvents="none">
              <View style={styles.dimensionLabel}>
                <Text style={styles.dimensionLabelText}>
                  {sticker.widthMm.toFixed(1)} × {sticker.heightMm.toFixed(1)} mm
                  {sourcePpi !== null && (
                    <Text
                      style={
                        sourcePpi < LOW_PPI_WARNING_THRESHOLD ? styles.dimensionLabelWarning : undefined
                      }
                    >
                      {"  ·  "}
                      {Math.round(sourcePpi)} PPI
                      {sourcePpi < LOW_PPI_WARNING_THRESHOLD ? " (low)" : ""}
                    </Text>
                  )}
                </Text>

                {/* Background removal isn't implemented yet — this
                    always reads ORIGINAL BG today. It's shown
                    unconditionally, honestly, rather than leaving you
                    guessing whether it silently ran. */}
                <Text style={styles.backgroundBadgeText}>
                  {sticker.backgroundRemoved ? "BG REMOVED" : "ORIGINAL BG"}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </GestureDetector>

      {/* Rendered after (so stacked on top of) visualBox — see the
          "separated gesture region" note in the component doc comment
          above for why that ordering is what keeps these from
          competing with the move gesture for the same touch. */}
      {selected && (
        <>
          <GestureDetector gesture={resizeTopLeftGesture}>
            <Animated.View
              style={[
                styles.resizeTouchTarget,
                {
                  left: RESIZE_TOUCH_TARGET_MARGIN - halfTouchTarget,
                  top: RESIZE_TOUCH_TARGET_MARGIN - halfTouchTarget,
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
                  left: RESIZE_TOUCH_TARGET_MARGIN + width - halfTouchTarget,
                  top: RESIZE_TOUCH_TARGET_MARGIN - halfTouchTarget,
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
                  left: RESIZE_TOUCH_TARGET_MARGIN - halfTouchTarget,
                  top: RESIZE_TOUCH_TARGET_MARGIN + height - halfTouchTarget,
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
                  left: RESIZE_TOUCH_TARGET_MARGIN + width - halfTouchTarget,
                  top: RESIZE_TOUCH_TARGET_MARGIN + height - halfTouchTarget,
                },
                bottomRightHandleStyle,
              ]}
            >
              <View style={styles.resizeHandleVisual} pointerEvents="none" />
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </View>
  );
}
