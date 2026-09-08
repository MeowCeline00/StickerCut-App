import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { generateRulerTicks } from '@/utils/rulerTicks';

import { styles } from './CanvasRuler.styles';

// Below this many px of drag, a touch on the ruler is treated as a
// tap/mis-touch rather than an intentional "pull a guide out" drag —
// avoids creating a stray guide at position 0 from a light touch.
const GUIDE_DRAG_THRESHOLD_PX = 8;

interface CanvasRulerProps {
  orientation: 'horizontal' | 'vertical';
  // Physical length of the PAGE (not the ruler view) along this
  // ruler's axis, in millimeters.
  lengthMm: number;
  // Same editorScale used to lay out the page/stickers, so ruler
  // marks line up with the page pixel-for-pixel.
  editorScale: number;
  // Called once, when a drag off the ruler ends, with the resulting
  // guide position in mm (already clamped to [0, lengthMm]). Dragging
  // DOWN off the top ruler creates a horizontal guide; dragging RIGHT
  // off the left ruler creates a vertical guide. Omit to disable
  // guide creation for this ruler instance.
  onCreateGuide?: (positionMm: number) => void;
}

// A single ruler strip (top or left) whose ticks are generated from
// the page's real physical size and the current on-screen scale —
// never a hardcoded set of values — so it stays correct for any
// canvas preset (A4, A5, Letter, 4x6, ...) and any zoom level. This
// component only draws the ruler; alignment with the page's top-left
// corner comes from the 2x2 grid layout it's placed in by the editor
// screen (blank spacer / top ruler / left ruler / page), not from any
// offset math here.
export function CanvasRuler({ orientation, lengthMm, editorScale, onCreateGuide }: CanvasRulerProps) {
  const ticks = generateRulerTicks(lengthMm, editorScale);
  const isHorizontal = orientation === 'horizontal';

  // Dragging off the ruler, perpendicular to its own axis, pulls out a
  // guide. The ruler sits directly against the page (see the 2x2 grid
  // layout note above), so the gesture's own translation along that
  // perpendicular axis — clamped to the page's length — is already the
  // guide's position in display px; converting by editorScale gives mm.
  const dragGesture = Gesture.Pan().onEnd((event) => {
    if (!onCreateGuide) {
      return;
    }

    const translation = isHorizontal ? event.translationY : event.translationX;

    if (Math.abs(translation) < GUIDE_DRAG_THRESHOLD_PX) {
      return;
    }

    const rawPositionMm = translation / editorScale;
    const clampedPositionMm = Math.min(Math.max(0, rawPositionMm), lengthMm);

    runOnJS(onCreateGuide)(clampedPositionMm);
  });

  const ruler = (
    <View
      style={[
        styles.container,
        isHorizontal
          ? { width: lengthMm * editorScale, height: styles.horizontalHeight.height }
          : { height: lengthMm * editorScale, width: styles.verticalWidth.width },
      ]}
    >
      {ticks.map((tick) => (
        <View
          key={tick.valueMm}
          style={[
            styles.tickWrapper,
            isHorizontal
              ? { left: tick.displayPx }
              : { top: tick.displayPx },
          ]}
        >
          <View
            style={[
              isHorizontal ? styles.tickMarkVertical : styles.tickMarkHorizontal,
              tick.isMajor
                ? (isHorizontal ? styles.tickMarkMajorVertical : styles.tickMarkMajorHorizontal)
                : (isHorizontal ? styles.tickMarkMinorVertical : styles.tickMarkMinorHorizontal),
            ]}
          />
          {tick.isMajor && (
            <Text
              style={[styles.tickLabel, isHorizontal ? styles.tickLabelHorizontal : styles.tickLabelVertical]}
            >
              {Math.round(tick.valueMm)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  if (!onCreateGuide) {
    return ruler;
  }

  return <GestureDetector gesture={dragGesture}>{ruler}</GestureDetector>;
}
