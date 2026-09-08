import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import type { StickerObject } from "@/types/sticker";
import { MIN_STICKER_MM } from "@/utils/stickers";
import { computeCornerResizeDelta, computeRotationDeltaDegrees } from "@/utils/stickerTransformMath";
import { calculateSourcePpi, mmToDisplay } from "@/utils/units";

import { CutLinePreview, SelectionBadges, SelectionHandles } from "./StickerTransformOverlay";
import { styles } from "./StickerItem.styles";

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

// The rotation handle sits above the box's top edge by this many
// display px, and shares the same touch-target size as the corner
// handles for a consistent, finger-friendly hit area. Placed
// top-center (a common "rotate stick" pattern) rather than the Figma
// reference's bottom-right position, so it never collides with the
// bottom-right resize handle.
const ROTATE_HANDLE_GAP = 30;

interface StickerItemProps {
  sticker: StickerObject;
  // px-per-mm scale from the parent editor, shared by every
  // sticker so they all convert their mm geometry the same way.
  editorScale: number;
  selected: boolean;
  // The "tap to select" gesture for THIS sticker, created by the
  // parent editor screen (not here) — see editor.tsx's
  // stickerSelectGestureById / canvasDeselectGesture for why: the
  // page's deselect-on-empty-tap gesture has to call
  // .requireExternalGestureToFail(...) against every sticker's select
  // gesture, which requires both gesture objects to exist in the same
  // scope. This component still owns and races its own move (Pan)
  // gesture against it.
  selectGesture: ReturnType<typeof Gesture.Tap>;
  // Called once, when a drag finishes, with the physical distance
  // moved in mm — not on every frame. The editor screen owns
  // project state, so it applies the delta to the sticker's stored
  // xMm/yMm (and clamps it to the page) and autosaves; this
  // component never mutates geometry itself, it only reports what
  // the user's finger did.
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
  // Same delta pattern as onMove/onResize: reports how many degrees
  // the rotation handle moved the sticker, once the drag ends. The
  // parent normalizes sticker.rotation + delta into [0, 360).
  onRotate: (id: string, deltaDegrees: number) => void;
  // "transform" (the default) shows the normal move/resize/rotate
  // selection UI. "cutLine" swaps the selection overlay for a
  // colored preview of the sticker's cut path and hides the
  // transform handles, since the Cut Line tab is about the cut
  // path, not the sticker's geometry.
  interactionMode?: "transform" | "cutLine";
}

/**
 * Renders one sticker on the editor canvas and owns every gesture that
 * can change its geometry (move, four-corner resize, rotate).
 * Permanent geometry (xMm/yMm/widthMm/heightMm/rotation) lives in
 * millimeters on the StickerObject — this component only converts to
 * on-screen pixels for display, so print output never depends on any
 * particular phone's screen size.
 *
 * This file owns image rendering, the main move gesture, and selection
 * (CRITICAL FIX 3's split). The actual JSX for the selection
 * border/labels and the resize/rotate handles lives in
 * StickerTransformOverlay.tsx (presentational only — no gesture or
 * geometry logic of its own), and ALL of the resize- and
 * rotation-handle geometry lives in utils/stickerTransformMath.ts (plain
 * worklet functions, reused by both the live per-frame preview and the
 * on-release commit below) — this file only wires gestures to those
 * functions, it doesn't do the angle/anchor math itself.
 *
 * Layout is three nested layers, from outside in:
 *  - interactionRoot: a plain, non-animated View sized to the
 *    sticker's committed box PLUS RESIZE_TOUCH_TARGET_MARGIN on every
 *    side (see the comment on RESIZE_TOUCH_TARGET_MARGIN above).
 *  - visualBox: the actual sticker — image, selection border, and
 *    dimension label — positioned at a fixed offset inside
 *    interactionRoot. Its live position/size/rotation while dragging
 *    comes from Reanimated shared values; its resting values come
 *    straight from the committed sticker prop.
 *  - corner touch targets + a rotation touch target, siblings of
 *    visualBox (rendered via SelectionHandles): each owns a single Pan
 *    gesture. Rendering them AFTER visualBox in JSX (so they stack on
 *    top of it) is what keeps a touch landing in a handle's small
 *    overlap zone from also being claimed by visualBox's own move
 *    gesture underneath — a "separated gesture region" rather than an
 *    explicit Gesture.Exclusive relationship, since the two never need
 *    to negotiate over the same touch in the first place.
 *
 * Resize/rotate geometry is previewed on the UI thread and committed
 * to project geometry only when the gesture ends — the *live* drag
 * position/size/rotation only ever exists in Reanimated shared values
 * here; the *committed* values stay in StickerObject and are only
 * updated once, via onMove/onResize/onRotate, when the finger lifts.
 * That split is why every shared value resets to 0 right after
 * calling one of those — the next render already reflects the new
 * committed geometry.
 *
 * KNOWN LIMITATION: the corner resize handles and the rotation handle
 * are positioned in the sticker's UNROTATED frame (they don't spin
 * around with the artwork). Only the image itself (inside visualBox)
 * actually rotates. This keeps the resize math simple — dragging a
 * corner still resizes correctly — but on a heavily rotated sticker
 * the handles will visually sit at the unrotated bounding box's
 * corners rather than the rotated artwork's corners.
 */
export function StickerItem({
  sticker,
  editorScale,
  selected,
  selectGesture,
  onMove,
  onResize,
  onRotate,
  interactionMode = "transform",
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
  const aspectLocked = sticker.aspectLocked ?? true;

  const outerLeft = left - RESIZE_TOUCH_TARGET_MARGIN;
  const outerTop = top - RESIZE_TOUCH_TARGET_MARGIN - ROTATE_HANDLE_GAP;
  const outerWidth = width + RESIZE_TOUCH_TARGET_MARGIN * 2;
  const outerHeight = height + RESIZE_TOUCH_TARGET_MARGIN * 2 + ROTATE_HANDLE_GAP;

  // processedUri (e.g. after background removal) is preferred for
  // display, but sourceUri is never overwritten.
  const imageUri = sticker.processedUri ?? sticker.sourceUri;

  // Derived on demand from stored geometry rather than cached on the
  // sticker, so it's automatically correct after a resize.
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

  // Live rotation delta (degrees) from the rotation handle, added on
  // top of the committed sticker.rotation while dragging.
  const liveRotationDelta = useSharedValue(0);

  const showTransformHandles = selected && interactionMode === "transform";
  const showCutLinePreview = selected && interactionMode === "cutLine";

  // selectGesture (created by the parent, see the prop doc above) always
  // selects on a quick, still tap. A drag only moves the sticker once
  // it's already selected — Gesture.Race lets the tap win immediately
  // for a stationary touch, while a finger that moves past the Pan
  // gesture's own activation distance hands the gesture to Pan instead.
  // That is what stops "tap to select" and "drag to move" from fighting
  // over the same touch.
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

  const moveGesture = Gesture.Race(selectGesture, panGesture);

  // Every corner's gesture follows the same shape: accumulate the raw
  // finger movement, then on release run it through
  // computeCornerResizeDelta to get the anchor-aware (and, when
  // aspectLocked, aspect-ratio-correct) result, convert that from
  // display px to mm, report it, and reset back to 0 (the next
  // render's "committed" width/height/xMm/yMm already includes what
  // was just committed). The move gesture above is a completely
  // separate GestureDetector on a completely separate view (visualBox
  // vs. these touch targets), so a resize drag can never also move
  // the sticker's body.
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
        aspectLocked,
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
        aspectLocked,
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
        aspectLocked,
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
        aspectLocked,
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

  // The rotation handle rests directly above the box's center. Its
  // vector from the box center, in the unrotated frame, is therefore
  // always straight up — (0, -(height/2 + ROTATE_HANDLE_GAP)). During
  // the drag, adding the gesture's cumulative translation to that
  // rest vector gives the touch's current vector from center; the
  // angle between that and the rest vector is how far the sticker has
  // been rotated. This is a completely separate gesture/touch target
  // from both the move gesture and the four resize gestures, so none
  // of the three can ever fire from the same touch.
  const restVectorX = 0;
  const restVectorY = -(height / 2 + ROTATE_HANDLE_GAP);

  const rotateGesture = Gesture.Pan()
    .onUpdate((event) => {
      liveRotationDelta.value = computeRotationDeltaDegrees(
        event.translationX,
        event.translationY,
        restVectorX,
        restVectorY,
      );
    })
    .onEnd(() => {
      const deltaDegrees = liveRotationDelta.value;
      liveRotationDelta.value = 0;
      runOnJS(onRotate)(sticker.id, deltaDegrees);
    });

  // visualBox's live style: sums all four corners' (mostly-zero — only
  // the one actually being dragged ever contributes anything)
  // deltas together with the move gesture's translation, plus the
  // live rotation delta on top of the committed rotation. Summing the
  // corner deltas is safe specifically because only one corner can
  // ever be mid-drag at a time (each owns its own separate touch
  // target/gesture), so the other three always contribute an exact
  // zero here.
  const animatedVisualBoxStyle = useAnimatedStyle(() => {
    const topLeftResult = computeCornerResizeDelta(
      "topLeft",
      resizeTopLeftDX.value,
      resizeTopLeftDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
      aspectLocked,
    );
    const topRightResult = computeCornerResizeDelta(
      "topRight",
      resizeTopRightDX.value,
      resizeTopRightDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
      aspectLocked,
    );
    const bottomLeftResult = computeCornerResizeDelta(
      "bottomLeft",
      resizeBottomLeftDX.value,
      resizeBottomLeftDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
      aspectLocked,
    );
    const bottomRightResult = computeCornerResizeDelta(
      "bottomRight",
      resizeBottomRightDX.value,
      resizeBottomRightDY.value,
      width,
      height,
      aspectRatio,
      minSizePx,
      aspectLocked,
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
        { rotate: `${sticker.rotation + liveRotationDelta.value}deg` },
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
  // committed geometry.
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

  // The rotation handle only tracks the whole-sticker move — it isn't
  // meant to visually spin around during its own drag, it just needs
  // to stay attached to the box while the box is being repositioned.
  const rotateHandleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragTranslateX.value },
      { translateY: dragTranslateY.value },
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
            {
              left: RESIZE_TOUCH_TARGET_MARGIN,
              top: RESIZE_TOUCH_TARGET_MARGIN + ROTATE_HANDLE_GAP,
              width,
              height,
            },
            animatedVisualBoxStyle,
          ]}
        >
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />

          {selected && interactionMode === "transform" && (
            <SelectionBadges sticker={sticker} sourcePpi={sourcePpi} />
          )}

          {showCutLinePreview && <CutLinePreview sticker={sticker} />}
        </Animated.View>
      </GestureDetector>

      {showTransformHandles && (
        <SelectionHandles
          width={width}
          height={height}
          resizeTouchTargetMargin={RESIZE_TOUCH_TARGET_MARGIN}
          rotateHandleGap={ROTATE_HANDLE_GAP}
          halfTouchTarget={halfTouchTarget}
          topLeftHandleStyle={topLeftHandleStyle}
          topRightHandleStyle={topRightHandleStyle}
          bottomLeftHandleStyle={bottomLeftHandleStyle}
          bottomRightHandleStyle={bottomRightHandleStyle}
          rotateHandleStyle={rotateHandleStyle}
          resizeTopLeftGesture={resizeTopLeftGesture}
          resizeTopRightGesture={resizeTopRightGesture}
          resizeBottomLeftGesture={resizeBottomLeftGesture}
          resizeBottomRightGesture={resizeBottomRightGesture}
          rotateGesture={rotateGesture}
        />
      )}
    </View>
  );
}
