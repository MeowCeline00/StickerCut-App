import { View, Text } from 'react-native';

import { generateRulerTicks } from '@/utils/rulerTicks';

import { styles } from './CanvasRuler.styles';

interface CanvasRulerProps {
  orientation: 'horizontal' | 'vertical';
  // Physical length of the PAGE (not the ruler view) along this
  // ruler's axis, in millimeters.
  lengthMm: number;
  // Same editorScale used to lay out the page/stickers, so ruler
  // marks line up with the page pixel-for-pixel.
  editorScale: number;
}

// A single ruler strip (top or left) whose ticks are generated from
// the page's real physical size and the current on-screen scale —
// never a hardcoded set of values — so it stays correct for any
// canvas preset (A4, A5, Letter, 4x6, ...) and any zoom level. This
// component only draws the ruler; alignment with the page's top-left
// corner comes from the 2x2 grid layout it's placed in by the editor
// screen (blank spacer / top ruler / left ruler / page), not from any
// offset math here.
export function CanvasRuler({ orientation, lengthMm, editorScale }: CanvasRulerProps) {
  const ticks = generateRulerTicks(lengthMm, editorScale);
  const isHorizontal = orientation === 'horizontal';

  return (
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
}
