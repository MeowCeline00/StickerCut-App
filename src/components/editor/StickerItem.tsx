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
import { mmToDisplay } from "@/utils/units";

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
 * Delete (top-right) / rotate (bottom-right) auxiliary controls.
 *
 * Must match the same-named constants in StickerItem.styles.ts.
 * AUX_CONTROL_OFFSET is how far outside each resize corner the
 * control's CENTER sits (applied diagonally, on both axes) — chosen
 * so its touch target (half = 21) never overlaps the resize handle's
 * own touch target (half = 20) at the same corner: the distance
 * between the two centers is AUX_CONTROL_OFFSET * sqrt(2) ≈ 48, well
 * past the 41px the two touch radii would need to touch.
 */
const AUX_CONTROL_VISIBLE_SIZE = 24;
const AUX_CONTROL_TOUCH_SIZE = 42;
const AUX_CONTROL_OFFSET = 34;

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

  /**
   * Delete this sticker.
   *
   * StickerItem does not mutate project state itself — it only calls
   * back into editor.tsx, which owns project state, same as
   * onMove/onResize/onRotate above.
   */
  onDelete: (id: string) => void;

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
  onDelete,
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
   * The artwork's own top-left corner sits at (marginLeft, marginTop)
   * inside interactionRoot. Only the left/top-left/bottom-left side
   * uses the plain resize margin — the right side needs extra room
   * for the delete (top-right) and rotate (bottom-right) auxiliary
   * controls, which sit AUX_CONTROL_OFFSET past the corner plus their
   * own half touch-target size.
   */
  const marginLeft =
    RESIZE_TOUCH_TARGET_MARGIN;

  const auxMargin =
    AUX_CONTROL_OFFSET +
    AUX_CONTROL_TOUCH_SIZE / 2;

  const marginTop = auxMargin;
  const marginRight = auxMargin;
  const marginBottom = auxMargin;

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
   * At rest the rotate handle sits diagonally outside the bottom-right
   * corner (CRITICAL FIX 6), so its rest vector points down-and-right
   * from center rather than straight up.
   */
  const restVectorX =
    width / 2 +
    AUX_CONTROL_OFFSET;

  const restVectorY =
    height / 2 +
    AUX_CONTROL_OFFSET;

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
  // DELETE
  // ============================================================

  /**
   * Single tap on the × control deletes immediately — no confirmation
   * dialog (Duplicate/Revert remain available separately if the user
   * wants a safety net). This is its own GestureDetector region, like
   * the resize/rotate handles, so it never fires alongside a body
   * drag or a resize.
   */
  const deleteGesture =
    Gesture.Tap()
      .maxDistance(8)

      .onEnd(
        (_event, success) => {
          if (success) {
            runOnJS(onDelete)(
              sticker.id,
            );
          }
        },
      );

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
            marginLeft,

          top:
            marginTop,

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
          marginLeft +
          result.deltaLeft,

        top:
          marginTop +
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
    marginLeft;

  const interactionTop =
    top -
    marginTop;

  const interactionWidth =
    width +
    marginLeft +
    marginRight;

  const interactionHeight =
    height +
    marginTop +
    marginBottom;

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
            />
          )}

          {showCutLine && (
            <CutLinePreview
              sticker={sticker}
              editorScale={editorScale}
              artworkWidthPx={width}
              artworkHeightPx={height}
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

          marginLeft={
            marginLeft
          }

          marginTop={
            marginTop
          }

          halfTouchTarget={
            RESIZE_TOUCH_TARGET_SIZE /
            2
          }

          auxControlOffset={
            AUX_CONTROL_OFFSET
          }

          auxHalfTouchTarget={
            AUX_CONTROL_TOUCH_SIZE /
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

          deleteGesture={
            deleteGesture
          }
        />
      )}
    </View>
  );
}