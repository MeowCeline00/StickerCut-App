import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

export const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.ruler,
  },

  tickWrapper: {
    position: 'absolute',
  },

  tickMarkVertical: {
    width: 1,
    backgroundColor: Colors.borderBright,
  },
  tickMarkMajorVertical: {
    height: 10,
    bottom: 0,
    position: 'absolute',
  },
  tickMarkMinorVertical: {
    height: 5,
    bottom: 0,
    position: 'absolute',
  },

  tickMarkHorizontal: {
    height: 1,
    backgroundColor: Colors.borderBright,
  },
  tickMarkMajorHorizontal: {
    width: 10,
    right: 0,
    position: 'absolute',
  },
  tickMarkMinorHorizontal: {
    width: 5,
    right: 0,
    position: 'absolute',
  },

  tickLabel: {
    position: 'absolute',
    fontSize: 8,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
  },
  // Centered ON the tick line, not offset to the right of it (CRITICAL
  // FIX 7) — the label is given a fixed width wider than any value it
  // will realistically show ("0" through 3-digit mm values) and shifted
  // left by half of it, with textAlign:'center', so the tick's own left
  // edge (0 offset from the wrapper, which is already positioned at the
  // tick's real display px) lands under the middle of the text
  // regardless of how many digits it has.
  tickLabelHorizontal: {
    top: 3,
    left: -14,
    width: 28,
    textAlign: 'center',
  },
  tickLabelVertical: {
    // Vertically centers the label on its tick's horizontal line —
    // half the label's own line height above the tick's top:0 position.
    top: -5,
    left: 3,
  },
});
