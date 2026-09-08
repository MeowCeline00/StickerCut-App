import {
  View,
} from "react-native";

import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type {
  CanvasGuide,
} from "@/types/project";

import {
  styles,
} from "./GuideLine.styles";

interface GuideLineProps {
  guide: CanvasGuide;

  /**
   * Horizontal guide spans page width.
   * Vertical guide spans page height.
   */
  pageLengthMm: number;

  editorScale: number;

  onMove: (
    id: string,
    positionMm: number,
  ) => void;

  onDelete: (
    id: string,
  ) => void;
}

const TOUCH_TARGET_THICKNESS =
  24;

/**
 * Editor-only alignment guide.
 *
 * The real line is only 1 px, but the surrounding 24 px touch region
 * makes it practical to grab with a mouse or finger.
 */
export function GuideLine({
  guide,
  pageLengthMm,
  editorScale,
  onMove,
  onDelete,
}: GuideLineProps) {
  const isHorizontal =
    guide.axis ===
    "horizontal";

  const committedPositionPx =
    guide.positionMm *
    editorScale;

  const pageLengthPx =
    pageLengthMm *
    editorScale;

  const dragTranslate =
    useSharedValue(0);

  const tapGesture =
    Gesture.Tap()
      .maxDistance(6)
      .onEnd(
        (_event, success) => {
          if (success) {
            runOnJS(
              onDelete,
            )(guide.id);
          }
        },
      );

  const panGesture =
    Gesture.Pan()
      .minDistance(3)

      .onUpdate((event) => {
        dragTranslate.value =
          isHorizontal
            ? event.translationY
            : event.translationX;
      })

      .onEnd(() => {
        const deltaMm =
          dragTranslate.value /
          editorScale;

        const nextPositionMm =
          guide.positionMm +
          deltaMm;

        runOnJS(
          onMove,
        )(
          guide.id,
          nextPositionMm,
        );

        dragTranslate.value =
          0;
      })

      .onFinalize(() => {
        dragTranslate.value =
          0;
      });

  const gesture =
    Gesture.Race(
      tapGesture,
      panGesture,
    );

  const animatedStyle =
    useAnimatedStyle(() => ({
      transform:
        isHorizontal
          ? [
              {
                translateY:
                  dragTranslate.value,
              },
            ]
          : [
              {
                translateX:
                  dragTranslate.value,
              },
            ],
    }));

  return (
    <GestureDetector
      gesture={gesture}
    >
      <Animated.View
        pointerEvents="box-only"
        style={[
          styles.touchTarget,

          isHorizontal
            ? {
                left: 0,

                width:
                  pageLengthPx,

                height:
                  TOUCH_TARGET_THICKNESS,

                top:
                  committedPositionPx -
                  TOUCH_TARGET_THICKNESS /
                    2,
              }
            : {
                top: 0,

                height:
                  pageLengthPx,

                width:
                  TOUCH_TARGET_THICKNESS,

                left:
                  committedPositionPx -
                  TOUCH_TARGET_THICKNESS /
                    2,
              },

          animatedStyle,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            isHorizontal
              ? styles.horizontalLine
              : styles.verticalLine,

            isHorizontal
              ? {
                  top:
                    TOUCH_TARGET_THICKNESS /
                    2,
                }
              : {
                  left:
                    TOUCH_TARGET_THICKNESS /
                    2,
                },
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}