import {
  StyleSheet,
  View,
} from 'react-native';

import { styles } from '@/components/BlueprintGrid.styles';

import { Colors } from '@/constants/colors';

const GRID_SIZE = 16;

const VERTICAL_LINES = 50;
const HORIZONTAL_LINES = 80;

export function BlueprintGrid() {
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {Array.from({
        length: VERTICAL_LINES,
      }).map((_, index) => (
        <View
          key={`vertical-${index}`}
          style={[
            styles.verticalLine,

            {
              left:
                index * GRID_SIZE,

              backgroundColor:
                index % 5 === 0
                  ? Colors.gridMajor
                  : Colors.gridMinor,
            },
          ]}
        />
      ))}

      {Array.from({
        length: HORIZONTAL_LINES,
      }).map((_, index) => (
        <View
          key={`horizontal-${index}`}
          style={[
            styles.horizontalLine,

            {
              top:
                index * GRID_SIZE,

              backgroundColor:
                index % 5 === 0
                  ? Colors.gridMajor
                  : Colors.gridMinor,
            },
          ]}
        />
      ))}
    </View>
  );
}
