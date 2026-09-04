import { StyleSheet } from 'react-native';

export const styles =
  StyleSheet.create({
    verticalLine: {
      position: 'absolute',

      top: 0,
      bottom: 0,

      width:
        StyleSheet.hairlineWidth,
    },

    horizontalLine: {
      position: 'absolute',

      left: 0,
      right: 0,

      height:
        StyleSheet.hairlineWidth,
    },
  });
