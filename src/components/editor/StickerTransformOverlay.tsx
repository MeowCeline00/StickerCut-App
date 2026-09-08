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
} from "@/constants/cut-line";

import type {
  StickerObject,
} from "@/types/sticker";

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
 * Only the physical size — plus a tiny rotation indicator when the
 * sticker is actually rotated — renders over the artwork. PPI and
 * background-removal state used to render here too, but that made the
 * annotation big enough to obstruct the artwork itself; they now live
 * in the editor's selected-object info row instead (see editor.tsx),
 * which has room to be readable without covering anything.
 *
 * This component is presentational only.
 * Gesture logic remains inside StickerItem.tsx.
 */
export function SelectionBadges({
  sticker,
}: SelectionBadgesProps) {
  const rotationDeg =
    Math.round(
      sticker.rotation,
    );

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

        {rotationDeg !== 0 && (
          <Text
            style={
              styles.rotationLabelText
            }
            numberOfLines={1}
          >
            {rotationDeg}°
          </Text>
        )}
      </View>
    </View>
  );
}

interface CutLinePreviewProps {
  sticker: StickerObject;
}

/**
 * Temporary visual cut-line preview.
 *
 * This is NOT the final contour-tracing implementation.
 */
export function CutLinePreview({
  sticker,
}: CutLinePreviewProps) {
  const shape =
    sticker.cutLine.shape ??
    DEFAULT_CUT_LINE_SHAPE;

  const color =
    sticker.cutLine.color ??
    DEFAULT_CUT_LINE_COLOR;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.cutLinePreviewOverlay,

        shape === "rect"
          ? styles.cutLinePreviewRect
          : styles.cutLinePreviewRound,

        {
          borderColor:
            color,
        },
      ]}
    />
  );
}

interface SelectionHandlesProps {
  width: number;

  height: number;

  resizeTouchTargetMargin:
    number;

  rotateHandleGap:
    number;

  halfTouchTarget:
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
}

/**
 * Four resize handles plus one rotation handle.
 *
 * Gesture state and transform mathematics remain owned by
 * StickerItem.tsx. This component is responsible only for positioning
 * the touch targets.
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
      {/* TOP LEFT */}
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
                resizeTouchTargetMargin -
                halfTouchTarget,

              top:
                resizeTouchTargetMargin +
                rotateHandleGap -
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

      {/* TOP RIGHT */}
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
                resizeTouchTargetMargin +
                width -
                halfTouchTarget,

              top:
                resizeTouchTargetMargin +
                rotateHandleGap -
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

      {/* BOTTOM LEFT */}
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
                resizeTouchTargetMargin -
                halfTouchTarget,

              top:
                resizeTouchTargetMargin +
                rotateHandleGap +
                height -
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

      {/* BOTTOM RIGHT */}
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
                resizeTouchTargetMargin +
                width -
                halfTouchTarget,

              top:
                resizeTouchTargetMargin +
                rotateHandleGap +
                height -
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

      {/* ROTATION HANDLE */}
      <GestureDetector
        gesture={
          rotateGesture
        }
      >
        <Animated.View
          style={[
            styles.resizeTouchTarget,

            {
              left:
                resizeTouchTargetMargin +
                width / 2 -
                halfTouchTarget,

              top:
                resizeTouchTargetMargin -
                halfTouchTarget,
            },

            rotateHandleStyle,
          ]}
        >
          <View
            style={
              styles.rotateHandleVisual
            }
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>
    </>
  );
}