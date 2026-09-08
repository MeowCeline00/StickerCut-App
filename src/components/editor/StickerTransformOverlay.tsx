import type { ComponentProps } from "react";

import {
  Text,
  View,
} from "react-native";

import Animated from "react-native-reanimated";

import type {
  GestureType,
} from "react-native-gesture-handler";

import {
  GestureDetector,
} from "react-native-gesture-handler";

import {
  DEFAULT_CUT_LINE_COLOR,
  DEFAULT_CUT_LINE_SHAPE,
  DEFAULT_CUT_OFFSET_MM,
  CUT_LINE_STROKE_PX,
} from "@/constants/cut-line";

import { createCutPath } from "@/cut/createCutPath";

import type {
  StickerObject,
} from "@/types/sticker";

import { mmToDisplay } from "@/utils/units";

import {
  styles,
} from "./StickerItem.styles";

/**
 * Use the exact style-prop type accepted by Animated.View.
 *
 * The previous version used:
 *
 * ReturnType<typeof useAnimatedStyle>
 *
 * With Reanimated 4 this loses the concrete ViewStyle generic and
 * becomes AnimatedStyleHandle<DefaultStyle>, which TypeScript then
 * refuses to pass into Animated.View.
 *
 * Deriving the type directly from Animated.View keeps it synchronized
 * with the version of Reanimated actually installed in this project.
 */
type AnimatedViewStyle =
  ComponentProps<
    typeof Animated.View
  >["style"];

export const LOW_PPI_WARNING_THRESHOLD =
  150;

interface SelectionBadgesProps {
  sticker: StickerObject;
}

/**
 * Minimal on-canvas readout for the selected sticker (CRITICAL FIX 5).
 *
 * Only the physical size renders over the artwork. PPI, background
 * state, and rotation all used to render here too, but that made the
 * annotation big enough to obstruct the artwork itself, and rotation
 * in particular is now communicated by the ↻ handle itself rather
 * than a number — see editor.tsx's selectionInfoRow for the readable
 * "Rotation: 23°" line instead.
 *
 * This component is presentational only.
 * Gesture logic remains inside StickerItem.tsx.
 */
export function SelectionBadges({
  sticker,
}: SelectionBadgesProps) {
  return (
    <View
      style={
        styles.selectionOverlay
      }
      pointerEvents="none"
    >
      <View
        style={
          styles.dimensionLabel
        }
      >
        <Text
          style={
            styles.dimensionLabelText
          }
          numberOfLines={1}
        >
          {sticker.widthMm.toFixed(
            1,
          )}
          {" × "}
          {sticker.heightMm.toFixed(
            1,
          )}
          {" mm"}
        </Text>
      </View>
    </View>
  );
}

interface CutLinePreviewProps {
  sticker: StickerObject;

  /**
   * Display px per physical mm — the same value StickerItem uses to
   * convert the artwork's own widthMm/heightMm into screen pixels, so
   * the cut line's offset is derived from the identical scale as the
   * artwork it surrounds.
   */
  editorScale: number;

  /**
   * The artwork's own on-screen size (display px), i.e. the same
   * `width`/`height` StickerItem already computed via mmToDisplay —
   * passed in rather than recomputed so there is exactly one source
   * of truth for it.
   */
  artworkWidthPx: number;
  artworkHeightPx: number;
}

/**
 * Cut-line preview built from the SAME geometry helpers
 * (src/cut/createCutPath.ts) used by the production preview screen,
 * so the editor's line and preview.tsx's line can never drift apart.
 *
 * This is a bounding-box approximation, not a true traced contour —
 * see createCutPath.ts's "tight" comment.
 */
export function CutLinePreview({
  sticker,
  editorScale,
  artworkWidthPx,
  artworkHeightPx,
}: CutLinePreviewProps) {
  const shape =
    sticker.cutLine.shape ??
    DEFAULT_CUT_LINE_SHAPE;

  const color =
    sticker.cutLine.color ??
    DEFAULT_CUT_LINE_COLOR;

  const offsetMm =
    sticker.cutLine.offsetMm ??
    DEFAULT_CUT_OFFSET_MM;

  const offsetPx =
    mmToDisplay(
      Math.max(0, offsetMm),
      editorScale,
    );

  const geometry =
    createCutPath(
      shape,
      artworkWidthPx,
      artworkHeightPx,
      offsetPx,
    );

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",

        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        height: geometry.height,

        borderRadius: geometry.borderRadius,
        borderWidth: CUT_LINE_STROKE_PX,
        borderColor: color,
        backgroundColor: "transparent",
      }}
    />
  );
}

interface SelectionHandlesProps {
  width: number;

  height: number;

  /**
   * Offset of the artwork's own top-left corner from the interaction
   * root's top-left corner. Unlike the old single symmetric margin,
   * left/top can differ from the space reserved on the right/bottom
   * for the delete (top-right) and rotate (bottom-right) controls.
   */
  marginLeft:
    number;

  marginTop:
    number;

  halfTouchTarget:
    number;

  /**
   * How far outside each resize corner the delete/rotate auxiliary
   * controls sit (applied diagonally, both axes), and half of their
   * own touch target size — used to position them without overlapping
   * the resize handles at the same corner.
   */
  auxControlOffset:
    number;

  auxHalfTouchTarget:
    number;

  /*
   * These use Animated.View's own style prop type.
   *
   * This fixes the Reanimated 4 TypeScript errors that were previously
   * caused by AnimatedStyleHandle<DefaultStyle>.
   */
  topLeftHandleStyle:
    AnimatedViewStyle;

  topRightHandleStyle:
    AnimatedViewStyle;

  bottomLeftHandleStyle:
    AnimatedViewStyle;

  bottomRightHandleStyle:
    AnimatedViewStyle;

  rotateHandleStyle:
    AnimatedViewStyle;

  resizeTopLeftGesture:
    GestureType;

  resizeTopRightGesture:
    GestureType;

  resizeBottomLeftGesture:
    GestureType;

  resizeBottomRightGesture:
    GestureType;

  rotateGesture:
    GestureType;

  deleteGesture:
    GestureType;
}

/**
 * Four resize handles, one rotation handle (bottom-right, ↻), and one
 * delete control (top-right, ×).
 *
 * Gesture state and transform mathematics remain owned by
 * StickerItem.tsx. This component is responsible only for positioning
 * the touch targets.
 */
export function SelectionHandles({
  width,
  height,

  marginLeft,
  marginTop,
  halfTouchTarget,

  auxControlOffset,
  auxHalfTouchTarget,

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
  deleteGesture,
}: SelectionHandlesProps) {
  const cornerRight = marginLeft + width;
  const cornerBottom = marginTop + height;

  return (
    <>
      {/* TOP LEFT resize */}
      <GestureDetector
        gesture={
          resizeTopLeftGesture
        }
      >
        <Animated.View
          style={[
            styles.resizeTouchTarget,

            {
              left:
                marginLeft -
                halfTouchTarget,

              top:
                marginTop -
                halfTouchTarget,
            },

            topLeftHandleStyle,
          ]}
        >
          <View
            style={
              styles.resizeHandleVisual
            }
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>

      {/* TOP RIGHT resize */}
      <GestureDetector
        gesture={
          resizeTopRightGesture
        }
      >
        <Animated.View
          style={[
            styles.resizeTouchTarget,

            {
              left:
                cornerRight -
                halfTouchTarget,

              top:
                marginTop -
                halfTouchTarget,
            },

            topRightHandleStyle,
          ]}
        >
          <View
            style={
              styles.resizeHandleVisual
            }
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>

      {/* BOTTOM LEFT resize */}
      <GestureDetector
        gesture={
          resizeBottomLeftGesture
        }
      >
        <Animated.View
          style={[
            styles.resizeTouchTarget,

            {
              left:
                marginLeft -
                halfTouchTarget,

              top:
                cornerBottom -
                halfTouchTarget,
            },

            bottomLeftHandleStyle,
          ]}
        >
          <View
            style={
              styles.resizeHandleVisual
            }
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>

      {/* BOTTOM RIGHT resize */}
      <GestureDetector
        gesture={
          resizeBottomRightGesture
        }
      >
        <Animated.View
          style={[
            styles.resizeTouchTarget,

            {
              left:
                cornerRight -
                halfTouchTarget,

              top:
                cornerBottom -
                halfTouchTarget,
            },

            bottomRightHandleStyle,
          ]}
        >
          <View
            style={
              styles.resizeHandleVisual
            }
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>

      {/*
        ROTATE — bottom-right corner, offset diagonally outward past
        the bottom-right resize handle so their touch targets don't
        overlap. Shows a clear ↻ arrow rather than a bare dot.
      */}
      <GestureDetector
        gesture={
          rotateGesture
        }
      >
        <Animated.View
          style={[
            styles.auxTouchTarget,

            {
              left:
                cornerRight +
                auxControlOffset -
                auxHalfTouchTarget,

              top:
                cornerBottom +
                auxControlOffset -
                auxHalfTouchTarget,
            },

            rotateHandleStyle,
          ]}
        >
          <View
            style={
              styles.rotateHandleVisual
            }
            pointerEvents="none"
          >
            <Text
              style={
                styles.rotateHandleIcon
              }
            >
              ↻
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/*
        DELETE — top-right corner, offset diagonally outward past the
        top-right resize handle. A plain (non-animated) touch target:
        deletion doesn't need a live drag preview.
      */}
      <GestureDetector
        gesture={
          deleteGesture
        }
      >
        <View
          style={[
            styles.auxTouchTarget,

            {
              left:
                cornerRight +
                auxControlOffset -
                auxHalfTouchTarget,

              top:
                marginTop -
                auxControlOffset -
                auxHalfTouchTarget,
            },
          ]}
        >
          <View
            style={
              styles.deleteControlVisual
            }
            pointerEvents="none"
          >
            <Text
              style={
                styles.deleteControlText
              }
            >
              ×
            </Text>
          </View>
        </View>
      </GestureDetector>
    </>
  );
}
