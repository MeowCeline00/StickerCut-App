import {
  Text,
  View,
} from "react-native";

import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import {
  runOnJS,
} from "react-native-reanimated";

import {
  generateRulerTicks,
} from "@/utils/rulerTicks";

import {
  styles,
} from "./CanvasRuler.styles";

const GUIDE_DRAG_THRESHOLD_PX =
  6;

interface CanvasRulerProps {
  orientation:
    | "horizontal"
    | "vertical";

  lengthMm:
    number;

  editorScale:
    number;

  onGuideDragStart?:
    () => void;

  onGuideDrag?:
    (
      positionMm:
        number,
    ) => void;

  onGuideDragEnd?:
    (
      positionMm:
        number | null,
    ) => void;
}

export function CanvasRuler({
  orientation,

  lengthMm,
  editorScale,

  onGuideDragStart,
  onGuideDrag,
  onGuideDragEnd,
}: CanvasRulerProps) {
  const horizontal =
    orientation ===
    "horizontal";

  const ticks =
    generateRulerTicks(
      lengthMm,
      editorScale,
    );

  function toGuidePositionMm(
    translation:
      number,
  ) {
    "worklet";

    const mm =
      translation /
      editorScale;

    return Math.min(
      Math.max(
        0,
        mm,
      ),

      lengthMm,
    );
  }

  const gesture =
    Gesture.Pan()
      .minDistance(2)

      .onBegin(() => {
        if (
          onGuideDragStart
        ) {
          runOnJS(
            onGuideDragStart,
          )();
        }
      })

      .onUpdate(
        (event) => {
          if (
            !onGuideDrag
          ) {
            return;
          }

          const translation =
            horizontal
              ? event.translationY
              : event.translationX;

          runOnJS(
            onGuideDrag,
          )(
            toGuidePositionMm(
              translation,
            ),
          );
        },
      )

      .onEnd(
        (event) => {
          if (
            !onGuideDragEnd
          ) {
            return;
          }

          const translation =
            horizontal
              ? event.translationY
              : event.translationX;

          if (
            Math.abs(
              translation,
            ) <
            GUIDE_DRAG_THRESHOLD_PX
          ) {
            runOnJS(
              onGuideDragEnd,
            )(null);

            return;
          }

          runOnJS(
            onGuideDragEnd,
          )(
            toGuidePositionMm(
              translation,
            ),
          );
        },
      );

  return (
    <GestureDetector
      gesture={gesture}
    >
      <View
        style={[
          styles.container,

          horizontal
            ? {
                width:
                  lengthMm *
                  editorScale,

                height:
                  22,
              }
            : {
                height:
                  lengthMm *
                  editorScale,

                width:
                  22,
              },
        ]}
      >
        {ticks.map(
          (tick) => (
            <View
              key={
                tick.valueMm
              }

              pointerEvents="none"

              style={[
                styles.tickWrapper,

                horizontal
                  ? {
                      left:
                        tick.displayPx,
                    }
                  : {
                      top:
                        tick.displayPx,
                    },
              ]}
            >
              <View
                style={[
                  horizontal
                    ? styles.tickMarkVertical
                    : styles.tickMarkHorizontal,

                  tick.isMajor
                    ? horizontal
                      ? styles.tickMarkMajorVertical
                      : styles.tickMarkMajorHorizontal
                    : horizontal
                      ? styles.tickMarkMinorVertical
                      : styles.tickMarkMinorHorizontal,
                ]}
              />

              {tick.isMajor && (
                <Text
                  style={[
                    styles.tickLabel,

                    horizontal
                      ? styles.tickLabelHorizontal
                      : styles.tickLabelVertical,
                  ]}
                >
                  {Math.round(
                    tick.valueMm,
                  )}
                </Text>
              )}
            </View>
          ),
        )}
      </View>
    </GestureDetector>
  );
}