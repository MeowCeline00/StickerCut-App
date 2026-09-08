import { Image } from "expo-image";
import { View } from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { StickerObject } from "@/types/sticker";
import { MIN_STICKER_MM } from "@/utils/stickers";
import {
  computeCornerResizeDelta,
  computeRotationDeltaDegrees,
} from "@/utils/stickerTransformMath";
import {
  calculateSourcePpi,
  mmToDisplay,
} from "@/utils/units";

import {
  CutLinePreview,
  SelectionBadges,
  SelectionHandles,
} from "./StickerTransformOverlay";

import { styles } from "./StickerItem.styles";

/**
 * The visible resize handle is small, but the actual touch area is
 * deliberately larger so it is usable with a finger.
 */
const RESIZE_TOUCH_TARGET_SIZE = 40;

/**
 * The outer interaction container extends beyond the image so the
 * resize handles remain inside a real native hit-test area.
 */
const RESIZE_TOUCH_TARGET_MARGIN =
  RESIZE_TOUCH_TARGET_SIZE / 2 + 2;

/**
 * Distance between the top edge of the sticker and the rotation handle.
 */
const ROTATE_HANDLE_GAP = 30;

interface StickerItemProps {
  sticker: StickerObject;

  /**
   * Number of display pixels used for one physical millimeter.
   *
   * Permanent sticker geometry is NEVER stored in screen pixels.
   */
  editorScale: number;

  selected: boolean;

  /**
   * Select this sticker.
   *
   * StickerItem owns its own tap/pan gestures. The editor only owns
   * the selectedStickerId state.
   */
  onSelect: (id: string) => void;

  /**
   * Commit a completed movement to project state.
   *
   * Values are reported in millimeters.
   */
  onMove: (
    id: string,
    deltaXMm: number,
    deltaYMm: number,
  ) => void;

  /**
   * Commit a completed resize to project state.
   *
   * deltaXMm/deltaYMm are required for left/top handles because the
   * opposite corner remains anchored.
   */
  onResize: (
    id: string,
    deltaWidthMm: number,
    deltaHeightMm: number,
    deltaXMm: number,
    deltaYMm: number,
  ) => void;

  /**
   * Commit a completed rotation.
   */
  onRotate: (
    id: string,
    deltaDegrees: number,
  ) => void;

  interactionMode?: "transform" | "cutLine";
}

/**
 * Renders one editable sticker.
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 *
 * Project state stores:
 *
 * xMm
 * yMm
 * widthMm
 * heightMm
 * rotation
 *
 * Reanimated stores temporary display movement while a gesture is active.
 *
 * This separation is intentional:
 *
 * finger movement
 *      ↓
 * temporary screen translation
 *      ↓
 * finger released
 *      ↓
 * convert px → mm
 *      ↓
 * update StickerProject
 *
 * This keeps printing/export independent from phone resolution.
 */
export function StickerItem({
  sticker,
  editorScale,
  selected,
  onSelect,
  onMove,
  onResize,
  onRotate,
  interactionMode = "transform",
}: StickerItemProps) {
  /**
   * Convert committed physical geometry into editor display coordinates.
   */
  const left = mmToDisplay(
    sticker.xMm,
    editorScale,
  );

  const top = mmToDisplay(
    sticker.yMm,
    editorScale,
  );

  const width = mmToDisplay(
    sticker.widthMm,
    editorScale,
  );

  const height = mmToDisplay(
    sticker.heightMm,
    editorScale,
  );

  const minSizePx = mmToDisplay(
    MIN_STICKER_MM,
    editorScale,
  );

  /**
   * Old saved projects may not contain aspectRatio.
   *
   * IMPORTANT:
   * `??` cannot be directly mixed with `||`.
   *
   * Therefore the fallback expression must be wrapped in parentheses.
   */
  const aspectRatio =
    sticker.aspectRatio ??
    (sticker.widthMm / sticker.heightMm || 1);

  const aspectLocked =
    sticker.aspectLocked ?? true;

  /**
   * Background removal will eventually create processedUri.
   *
   * The original sourceUri is deliberately preserved so processing
   * remains non-destructive.
   */
  const imageUri =
    sticker.processedUri ??
    sticker.sourceUri;

  /**
   * PPI is calculated from the original image pixels and its current
   * physical print width.
   */
  const sourcePpi =
    calculateSourcePpi(
      sticker.originalWidthPx,
      sticker.widthMm,
    );

  // ============================================================
  // MOVE STATE
  // ============================================================

  /**
   * Temporary on-screen movement.
   *
   * These values are NOT saved into StickerProject every frame.
   */
  const moveX = useSharedValue(0);
  const moveY = useSharedValue(0);

  // ============================================================
  // RESIZE STATE
  // ============================================================

  const tlX = useSharedValue(0);
  const tlY = useSharedValue(0);

  const trX = useSharedValue(0);
  const trY = useSharedValue(0);

  const blX = useSharedValue(0);
  const blY = useSharedValue(0);

  const brX = useSharedValue(0);
  const brY = useSharedValue(0);

  // ============================================================
  // ROTATION STATE
  // ============================================================

  const liveRotation =
    useSharedValue(0);

  const showTransformHandles =
    selected &&
    interactionMode === "transform";

  const showCutLine =
    selected &&
    interactionMode === "cutLine";

  // ============================================================
  // MOVE GESTURE
  // ============================================================

  /**
   * IMPORTANT FIX:
   *
   * Do NOT use:
   *
   *   .enabled(selected)
   *
   * A sticker should be draggable even when the drag begins while it
   * is not selected.
   *
   * Starting the Pan automatically selects it.
   */
  const movePan =
    Gesture.Pan()
      .minDistance(2)

      .onBegin(() => {
        runOnJS(onSelect)(
          sticker.id,
        );
      })

      .onUpdate((event) => {
        /**
         * translationX/Y are cumulative values from the beginning of
         * the gesture.
         *
         * Therefore we assign them directly rather than repeatedly
         * adding them.
         */
        moveX.value =
          event.translationX;

        moveY.value =
          event.translationY;
      })

      .onEnd((event) => {
        /**
         * Convert the final screen movement back into physical mm.
         */
        const deltaXMm =
          event.translationX /
          editorScale;

        const deltaYMm =
          event.translationY /
          editorScale;

        /**
         * Project state is owned by editor.tsx.
         */
        runOnJS(onMove)(
          sticker.id,
          deltaXMm,
          deltaYMm,
        );

        moveX.value = 0;
        moveY.value = 0;
      })

      .onFinalize(() => {
        /**
         * Also clean up temporary movement when Android/iOS cancels
         * the gesture rather than completing it normally.
         */
        moveX.value = 0;
        moveY.value = 0;
      });

  /**
   * A stationary touch selects the sticker without moving it.
   */
  const selectTap =
    Gesture.Tap()
      .maxDistance(8)

      .onEnd(
        (_event, success) => {
          if (success) {
            runOnJS(onSelect)(
              sticker.id,
            );
          }
        },
      );

  /**
   * The body can either become a tap or a drag.
   *
   * Stationary:
   *      Tap wins
   *
   * Movement:
   *      Pan wins
   */
  const bodyGesture =
    Gesture.Race(
      selectTap,
      movePan,
    );

  // ============================================================
  // RESIZE GESTURES
  // ============================================================

  /**
   * Shared resize gesture builder.
   *
   * Each handle owns its own shared X/Y values, but all four use the
   * same geometry function.
   */
  function buildResizeGesture(
    corner:
      | "topLeft"
      | "topRight"
      | "bottomLeft"
      | "bottomRight",

    dx: typeof tlX,
    dy: typeof tlY,
  ) {
    return Gesture.Pan()
      .minDistance(1)

      .onBegin(() => {
        runOnJS(onSelect)(
          sticker.id,
        );
      })

      .onUpdate((event) => {
        dx.value =
          event.translationX;

        dy.value =
          event.translationY;
      })

      .onEnd((event) => {
        const result =
          computeCornerResizeDelta(
            corner,
            event.translationX,
            event.translationY,
            width,
            height,
            aspectRatio,
            minSizePx,
            aspectLocked,
          );

        runOnJS(onResize)(
          sticker.id,

          result.deltaWidth /
            editorScale,

          result.deltaHeight /
            editorScale,

          result.deltaLeft /
            editorScale,

          result.deltaTop /
            editorScale,
        );

        dx.value = 0;
        dy.value = 0;
      })

      .onFinalize(() => {
        dx.value = 0;
        dy.value = 0;
      });
  }

  const resizeTopLeftGesture =
    buildResizeGesture(
      "topLeft",
      tlX,
      tlY,
    );

  const resizeTopRightGesture =
    buildResizeGesture(
      "topRight",
      trX,
      trY,
    );

  const resizeBottomLeftGesture =
    buildResizeGesture(
      "bottomLeft",
      blX,
      blY,
    );

  const resizeBottomRightGesture =
    buildResizeGesture(
      "bottomRight",
      brX,
      brY,
    );

  // ============================================================
  // ROTATION
  // ============================================================

  /**
   * Rotation is measured around the sticker center.
   *
   * At rest the rotation handle is directly above the center.
   */
  const restVectorX = 0;

  const restVectorY =
    -(
      height / 2 +
      ROTATE_HANDLE_GAP
    );

  const rotateGesture =
    Gesture.Pan()
      .minDistance(1)

      .onBegin(() => {
        runOnJS(onSelect)(
          sticker.id,
        );
      })

      .onUpdate((event) => {
        liveRotation.value =
          computeRotationDeltaDegrees(
            event.translationX,
            event.translationY,
            restVectorX,
            restVectorY,
          );
      })

      .onEnd(() => {
        const delta =
          liveRotation.value;

        runOnJS(onRotate)(
          sticker.id,
          delta,
        );

        liveRotation.value = 0;
      })

      .onFinalize(() => {
        liveRotation.value = 0;
      });

  // ============================================================
  // LIVE STICKER STYLE
  // ============================================================

  /**
   * This animated style controls:
   *
   * - live movement
   * - live resize preview
   * - live rotation
   *
   * The committed geometry still comes from sticker.
   */
  const liveBoxStyle =
    useAnimatedStyle(() => {
      let dx = 0;
      let dy = 0;

      let activeCorner:
        | "topLeft"
        | "topRight"
        | "bottomLeft"
        | "bottomRight"
        | null = null;

      if (
        tlX.value !== 0 ||
        tlY.value !== 0
      ) {
        activeCorner =
          "topLeft";

        dx = tlX.value;
        dy = tlY.value;
      } else if (
        trX.value !== 0 ||
        trY.value !== 0
      ) {
        activeCorner =
          "topRight";

        dx = trX.value;
        dy = trY.value;
      } else if (
        blX.value !== 0 ||
        blY.value !== 0
      ) {
        activeCorner =
          "bottomLeft";

        dx = blX.value;
        dy = blY.value;
      } else if (
        brX.value !== 0 ||
        brY.value !== 0
      ) {
        activeCorner =
          "bottomRight";

        dx = brX.value;
        dy = brY.value;
      }

      /**
       * Normal state / movement state.
       */
      if (!activeCorner) {
        return {
          left:
            RESIZE_TOUCH_TARGET_MARGIN,

          top:
            RESIZE_TOUCH_TARGET_MARGIN +
            ROTATE_HANDLE_GAP,

          width,
          height,

          transform: [
            {
              translateX:
                moveX.value,
            },

            {
              translateY:
                moveY.value,
            },

            {
              rotate:
                `${
                  sticker.rotation +
                  liveRotation.value
                }deg`,
            },
          ],
        };
      }

      /**
       * Resize preview.
       */
      const result =
        computeCornerResizeDelta(
          activeCorner,
          dx,
          dy,
          width,
          height,
          aspectRatio,
          minSizePx,
          aspectLocked,
        );

      return {
        left:
          RESIZE_TOUCH_TARGET_MARGIN +
          result.deltaLeft,

        top:
          RESIZE_TOUCH_TARGET_MARGIN +
          ROTATE_HANDLE_GAP +
          result.deltaTop,

        width:
          width +
          result.deltaWidth,

        height:
          height +
          result.deltaHeight,

        transform: [
          {
            translateX:
              moveX.value,
          },

          {
            translateY:
              moveY.value,
          },

          {
            rotate:
              `${
                sticker.rotation +
                liveRotation.value
              }deg`,
          },
        ],
      };
    });

  // ============================================================
  // INTERACTION ROOT
  // ============================================================

  /**
   * The interaction container is larger than the visible sticker.
   *
   * This is necessary because Android hit testing does not reliably
   * deliver touches to children that sit completely outside their
   * parent's native bounds.
   */
  const interactionLeft =
    left -
    RESIZE_TOUCH_TARGET_MARGIN;

  const interactionTop =
    top -
    RESIZE_TOUCH_TARGET_MARGIN -
    ROTATE_HANDLE_GAP;

  const interactionWidth =
    width +
    RESIZE_TOUCH_TARGET_MARGIN *
      2;

  const interactionHeight =
    height +
    RESIZE_TOUCH_TARGET_MARGIN *
      2 +
    ROTATE_HANDLE_GAP;

  // ============================================================
  // HANDLE PREVIEW STYLES
  // ============================================================

  const topLeftHandleStyle =
    useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX:
              tlX.value,
          },
          {
            translateY:
              tlY.value,
          },
        ],
      }),
    );

  const topRightHandleStyle =
    useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX:
              trX.value,
          },
          {
            translateY:
              trY.value,
          },
        ],
      }),
    );

  const bottomLeftHandleStyle =
    useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX:
              blX.value,
          },
          {
            translateY:
              blY.value,
          },
        ],
      }),
    );

  const bottomRightHandleStyle =
    useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX:
              brX.value,
          },
          {
            translateY:
              brY.value,
          },
        ],
      }),
    );

  const rotateHandleStyle =
    useAnimatedStyle(
      () => ({
        transform: [
          {
            rotate:
              `${liveRotation.value}deg`,
          },
        ],
      }),
    );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.interactionRoot,

        {
          left:
            interactionLeft,

          top:
            interactionTop,

          width:
            interactionWidth,

          height:
            interactionHeight,

          zIndex:
            sticker.zIndex,
        },
      ]}
    >
      {/*
        The body gesture belongs ONLY to the actual artwork box.

        Resize and rotation handles are separate sibling gesture
        regions below.
      */}
      <GestureDetector
        gesture={bodyGesture}
      >
        <Animated.View
          style={[
            styles.visualBox,
            liveBoxStyle,
          ]}
        >
          <Image
            source={{
              uri: imageUri,
            }}
            style={styles.image}
            contentFit="contain"
            pointerEvents="none"
          />

          {showTransformHandles && (
            <SelectionBadges
              sticker={sticker}
              sourcePpi={
                sourcePpi
              }
            />
          )}

          {showCutLine && (
            <CutLinePreview
              sticker={sticker}
            />
          )}
        </Animated.View>
      </GestureDetector>

      {/*
        Handles render AFTER the artwork.

        This gives their touch areas priority where a handle overlaps
        the sticker body.
      */}
      {showTransformHandles && (
        <SelectionHandles
          width={width}
          height={height}

          resizeTouchTargetMargin={
            RESIZE_TOUCH_TARGET_MARGIN
          }

          rotateHandleGap={
            ROTATE_HANDLE_GAP
          }

          halfTouchTarget={
            RESIZE_TOUCH_TARGET_SIZE /
            2
          }

          topLeftHandleStyle={
            topLeftHandleStyle
          }

          topRightHandleStyle={
            topRightHandleStyle
          }

          bottomLeftHandleStyle={
            bottomLeftHandleStyle
          }

          bottomRightHandleStyle={
            bottomRightHandleStyle
          }

          rotateHandleStyle={
            rotateHandleStyle
          }

          resizeTopLeftGesture={
            resizeTopLeftGesture
          }

          resizeTopRightGesture={
            resizeTopRightGesture
          }

          resizeBottomLeftGesture={
            resizeBottomLeftGesture
          }

          resizeBottomRightGesture={
            resizeBottomRightGesture
          }

          rotateGesture={
            rotateGesture
          }
        />
      )}
    </View>
  );
}