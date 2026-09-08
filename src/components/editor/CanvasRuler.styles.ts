import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

export const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.ruler,
  },

  // Referenced only for their numeric .height/.width values above —
  // not applied directly as styles themselves.
  horizontalHeight: {
    height: 20,
  },
  verticalWidth: {
    width: 20,
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
  tickLabelHorizontal: {
    top: 2,
    left: 2,
  },
  tickLabelVertical: {
    left: 2,
    top: 2,
    transform: [{ rotate: '0deg' }],
  },
});
