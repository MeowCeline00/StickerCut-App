import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import type { CanvasGuide } from "@/types/project";

import { styles } from "./GuideLine.styles";

interface GuideLineProps {
  guide: CanvasGuide;
  // Page length in mm along the guide's OWN axis (widthMm for a
  // vertical guide, heightMm for a horizontal one) — the guide is
  // drawn spanning the full page in that direction.
  pageLengthMm: number;
  editorScale: number;
  // Called once, when a drag finishes, with the new position in mm
  // (already clamped to the page). Never called for a plain tap.
  onMove: (id: string, positionMm: number) => void;
  // Called on tap — removes the guide. A tap is distinguished from a
  // drag the same way stickers do it (Gesture.Race).
  onDelete: (id: string) => void;
}

const TOUCH_TARGET_THICKNESS = 24;

/**
 * One reference guide: a thin line spanning the page, draggable along
 * its perpendicular axis and removable with a tap. Editor-only — never
 * rendered by preview.tsx, since guides live on StickerProject.guides
 * and preview.tsx never reads that field.
 */
export function GuideLine({ guide, pageLengthMm, editorScale, onMove, onDelete }: GuideLineProps) {
  const isHorizontal = guide.axis === "horizontal";
  const committedPositionPx = guide.positionMm * editorScale;
  const pageLengthPx = pageLengthMm * editorScale;

  const dragTranslate = useSharedValue(0);

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onDelete)(guide.id);
  });

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      dragTranslate.value += isHorizontal ? event.changeY : event.changeX;
    })
    .onEnd(() => {
      const deltaMm = dragTranslate.value / editorScale;
      dragTranslate.value = 0;
      runOnJS(onMove)(guide.id, guide.positionMm + deltaMm);
    });

  const gesture = Gesture.Race(tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: isHorizontal
      ? [{ translateY: dragTranslate.value }]
      : [{ translateX: dragTranslate.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        pointerEvents="box-only"
        style={[
          styles.touchTarget,
          isHorizontal
            ? {
                left: 0,
                width: pageLengthPx,
                height: TOUCH_TARGET_THICKNESS,
                top: committedPositionPx - TOUCH_TARGET_THICKNESS / 2,
              }
            : {
                top: 0,
                height: pageLengthPx,
                width: TOUCH_TARGET_THICKNESS,
                left: committedPositionPx - TOUCH_TARGET_THICKNESS / 2,
              },
          animatedStyle,
        ]}
      >
        <View
          style={[
            isHorizontal ? styles.horizontalLine : styles.verticalLine,
            isHorizontal
              ? { top: TOUCH_TARGET_THICKNESS / 2 }
              : { left: TOUCH_TARGET_THICKNESS / 2 },
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}
