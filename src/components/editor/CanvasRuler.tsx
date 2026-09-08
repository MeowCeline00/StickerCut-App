import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { PAGE_ORIGIN_OFFSET_PX } from '@/styles/editor.styles';
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
  // Guide-drag callback trio (CRITICAL FIX 8) — mirrors a normal
  // gesture lifecycle instead of a single onEnd-only callback, so the
  // caller can show a LIVE preview line while the drag is still in
  // progress, not just a guide that pops into existence on release.
  // Dragging DOWN off the top ruler creates a horizontal guide;
  // dragging RIGHT off the left ruler creates a vertical guide. All
  // three are optional together — omit them to disable guide creation
  // for this ruler instance (all-or-nothing: providing one without the
  // others would leave the drag lifecycle incomplete).
  //
  // onGuideDragStart() — the drag has just begun (moved past the
  //   mis-touch threshold isn't checked yet here; this fires on the
  //   gesture's own onStart, immediately on touch-down/mouse-down).
  // onGuideDrag(positionMm) — called on every frame while the drag is
  //   in progress, with the CURRENT (already clamped) position — the
  //   caller uses this to render a live-following preview line.
  // onGuideDragEnd(positionMm) — called once when the drag finishes.
  //   positionMm is null if the total movement never exceeded the
  //   mis-touch threshold (treat as a cancelled drag, no guide should
  //   be created); otherwise the final clamped position to commit.
  onGuideDragStart?: () => void;
  onGuideDrag?: (positionMm: number) => void;
  onGuideDragEnd?: (positionMm: number | null) => void;
}

// A single ruler strip (top or left) whose ticks are generated from
// the page's real physical size and the current on-screen scale —
// never a hardcoded set of values — so it stays correct for any
// canvas preset (A4, A5, Letter, 4x6, ...) and any zoom level. The
// ruler's own container is aligned with the page's outer edge by the
// 2x2 grid layout it's placed in by the editor screen (blank spacer /
// top ruler / left ruler / page) — but the page's mm=0 content origin
// sits PAGE_ORIGIN_OFFSET_PX inside that outer edge (the page's own
// border stroke), so every tick position is shifted by that same
// shared constant below (CRITICAL FIX 7) rather than relying on
// container-bounds alignment alone.
export function CanvasRuler({
  orientation,
  lengthMm,
  editorScale,
  onGuideDragStart,
  onGuideDrag,
  onGuideDragEnd,
}: CanvasRulerProps) {
  const ticks = generateRulerTicks(lengthMm, editorScale);
  const isHorizontal = orientation === 'horizontal';
  const dragEnabled = Boolean(onGuideDragStart && onGuideDrag && onGuideDragEnd);

  function translationToClampedMm(translation: number): number {
    'worklet';
    const rawPositionMm = translation / editorScale;
    return Math.min(Math.max(0, rawPositionMm), lengthMm);
  }

  // Dragging off the ruler, perpendicular to its own axis, pulls out a
  // guide. The ruler sits directly against the page (see the 2x2 grid
  // layout note above), so the gesture's own translation along that
  // perpendicular axis — clamped to the page's length — is already the
  // guide's position in display px; converting by editorScale gives mm.
  //
  // Gesture.Pan() already reports both touch (Android/iOS) and mouse
  // drags (React Native Web) through the same translationX/translationY
  // fields — no separate mouse-handling code path is needed here, only
  // that the full onStart/onUpdate/onEnd lifecycle actually be wired up
  // (CRITICAL FIX 8), which the previous onEnd-only version wasn't.
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      if (onGuideDragStart) {
        runOnJS(onGuideDragStart)();
      }
    })
    .onUpdate((event) => {
      if (!onGuideDrag) {
        return;
      }

      const translation = isHorizontal ? event.translationY : event.translationX;
      runOnJS(onGuideDrag)(translationToClampedMm(translation));
    })
    .onEnd((event) => {
      if (!onGuideDragEnd) {
        return;
      }

      const translation = isHorizontal ? event.translationY : event.translationX;

      if (Math.abs(translation) < GUIDE_DRAG_THRESHOLD_PX) {
        runOnJS(onGuideDragEnd)(null);
        return;
      }

      runOnJS(onGuideDragEnd)(translationToClampedMm(translation));
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
            // + PAGE_ORIGIN_OFFSET_PX: printCanvas's own border stroke
            // sits outside the real mm=0 origin (see that constant's
            // doc comment) — every tick, not just zero, needs this same
            // constant shift so the ruler's scale stays pixel-for-pixel
            // aligned with the page at every position, not just at one
            // point (CRITICAL FIX 7).
            isHorizontal
              ? { left: tick.displayPx + PAGE_ORIGIN_OFFSET_PX }
              : { top: tick.displayPx + PAGE_ORIGIN_OFFSET_PX },
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

  if (!dragEnabled) {
    return ruler;
  }

  return <GestureDetector gesture={dragGesture}>{ruler}</GestureDetector>;
}
